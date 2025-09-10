/**
 * Network Stack for AWS Multi-Region CDK Demo
 * Creates VPC, subnets, security groups, and networking components
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { NetworkStackProps, NetworkStackOutputs } from '../config/types';
import { NagSuppressions } from 'cdk-nag';

export class NetworkStack extends cdk.Stack {
  public readonly outputs: NetworkStackOutputs;

  constructor(scope: Construct, id: string, props: NetworkStackProps & cdk.StackProps) {
    super(scope, id, props);

    // Create VPC with specified CIDR block
    const vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr(props.cidrBlock),
      maxAzs: 2, // Use 2 AZs for high availability
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      natGateways: 2, // One NAT Gateway per AZ for high availability
    });

    // Create security groups for different tiers
    const webSecurityGroup = new ec2.SecurityGroup(this, 'WebSecurityGroup', {
      vpc,
      description: 'Security group for web tier (ALB, public-facing services)',
      allowAllOutbound: true,
    });

    const appSecurityGroup = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
      vpc,
      description: 'Security group for application tier (EC2, ECS)',
      allowAllOutbound: true,
    });

    const databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for database tier (RDS, ElastiCache)',
      allowAllOutbound: false, // Databases should not have outbound internet access
    });

    // Configure security group rules
    this.configureSecurityGroupRules(webSecurityGroup, appSecurityGroup, databaseSecurityGroup);

    // Create Transit Gateway if enabled (US region only)
    let transitGateway: ec2.CfnTransitGateway | undefined;
    if (props.enableTransitGateway) {
      transitGateway = this.createTransitGateway(vpc);
    }

    // Apply common tags
    if (props.tags) {
      Object.entries(props.tags).forEach(([key, value]) => {
        cdk.Tags.of(this).add(key, value);
      });
    }

    // Add environment and region specific tags
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Region', props.region);
    cdk.Tags.of(this).add('StackType', 'Network');

    // Create outputs
    this.outputs = {
      vpcId: vpc.vpcId,
      publicSubnetIds: vpc.publicSubnets.map(subnet => subnet.subnetId),
      privateSubnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
      securityGroupIds: {
        web: webSecurityGroup.securityGroupId,
        app: appSecurityGroup.securityGroupId,
        database: databaseSecurityGroup.securityGroupId,
      },
      transitGatewayId: transitGateway?.ref,
    };

    // Create CloudFormation outputs for cross-stack references
    this.createCloudFormationOutputs();

    // Apply CDK Nag suppressions for justified security exceptions
    this.applyCdkNagSuppressions();
  }

  /**
   * Configure security group rules following least privilege principle
   */
  private configureSecurityGroupRules(
    webSg: ec2.SecurityGroup,
    appSg: ec2.SecurityGroup,
    dbSg: ec2.SecurityGroup
  ): void {
    // Web tier security group rules
    webSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from internet'
    );
    webSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from internet'
    );

    // App tier security group rules
    appSg.addIngressRule(
      webSg,
      ec2.Port.tcp(8080),
      'Allow HTTP traffic from web tier'
    );
    appSg.addIngressRule(
      webSg,
      ec2.Port.tcp(8443),
      'Allow HTTPS traffic from web tier'
    );
    appSg.addIngressRule(
      appSg,
      ec2.Port.allTraffic(),
      'Allow communication within app tier'
    );

    // Database tier security group rules
    dbSg.addIngressRule(
      appSg,
      ec2.Port.tcp(3306),
      'Allow MySQL access from app tier'
    );
    dbSg.addIngressRule(
      appSg,
      ec2.Port.tcp(6379),
      'Allow Redis access from app tier'
    );
    dbSg.addIngressRule(
      dbSg,
      ec2.Port.allTraffic(),
      'Allow communication within database tier'
    );

    // IoT specific ports for app tier
    appSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8883),
      'Allow MQTT over TLS for IoT devices'
    );
    appSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS for IoT device management'
    );
  }

  /**
   * Create Transit Gateway for cross-region connectivity (US region only)
   */
  private createTransitGateway(vpc: ec2.Vpc): ec2.CfnTransitGateway {
    const transitGateway = new ec2.CfnTransitGateway(this, 'TransitGateway', {
      amazonSideAsn: 64512,
      description: 'Transit Gateway for multi-region connectivity',
      defaultRouteTableAssociation: 'enable',
      defaultRouteTablePropagation: 'enable',
      dnsSupport: 'enable',
      vpnEcmpSupport: 'enable',
      tags: [
        {
          key: 'Name',
          value: `${this.stackName}-TransitGateway`,
        },
      ],
    });

    // Create Transit Gateway VPC Attachment
    const tgwAttachment = new ec2.CfnTransitGatewayVpcAttachment(this, 'TransitGatewayVpcAttachment', {
      transitGatewayId: transitGateway.ref,
      vpcId: vpc.vpcId,
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
      tags: [
        {
          key: 'Name',
          value: `${this.stackName}-TGW-VPC-Attachment`,
        },
      ],
    });

    // Add routes to Transit Gateway in private route tables
    vpc.privateSubnets.forEach((subnet, index) => {
      new ec2.CfnRoute(this, `TGWRoute${index}`, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: '10.0.0.0/8', // Route all private traffic through TGW
        transitGatewayId: transitGateway.ref,
      }).addDependency(tgwAttachment);
    });

    return transitGateway;
  }

  /**
   * Create CloudFormation outputs for cross-stack references
   */
  private createCloudFormationOutputs(): void {
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.outputs.vpcId,
      description: 'VPC ID',
      exportName: `${this.stackName}-VpcId`,
    });

    new cdk.CfnOutput(this, 'PublicSubnetIds', {
      value: this.outputs.publicSubnetIds.join(','),
      description: 'Public subnet IDs',
      exportName: `${this.stackName}-PublicSubnetIds`,
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.outputs.privateSubnetIds.join(','),
      description: 'Private subnet IDs',
      exportName: `${this.stackName}-PrivateSubnetIds`,
    });

    new cdk.CfnOutput(this, 'WebSecurityGroupId', {
      value: this.outputs.securityGroupIds.web,
      description: 'Web tier security group ID',
      exportName: `${this.stackName}-WebSecurityGroupId`,
    });

    new cdk.CfnOutput(this, 'AppSecurityGroupId', {
      value: this.outputs.securityGroupIds.app,
      description: 'App tier security group ID',
      exportName: `${this.stackName}-AppSecurityGroupId`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
      value: this.outputs.securityGroupIds.database,
      description: 'Database tier security group ID',
      exportName: `${this.stackName}-DatabaseSecurityGroupId`,
    });

    if (this.outputs.transitGatewayId) {
      new cdk.CfnOutput(this, 'TransitGatewayId', {
        value: this.outputs.transitGatewayId,
        description: 'Transit Gateway ID',
        exportName: `${this.stackName}-TransitGatewayId`,
      });
    }
  }

  /**
   * Apply CDK Nag suppressions for justified security exceptions
   */
  private applyCdkNagSuppressions(): void {
    // Suppress CDK Nag rules that are acceptable for this demo
    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-VPC7',
        reason: 'VPC Flow Logs are not required for this demo environment',
      },
      {
        id: 'AwsSolutions-EC23',
        reason: 'Security group allows 0.0.0.0/0 inbound for web tier ALB - this is intentional for public access',
      },
    ]);
  }
}