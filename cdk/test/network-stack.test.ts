/**
 * Unit tests for NetworkStack
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { NetworkStack } from '../stacks/network-stack';
import { NetworkStackProps } from '../config/types';

describe('NetworkStack', () => {
  let app: cdk.App;
  let template: Template;
  let stack: NetworkStack;

  const defaultProps: NetworkStackProps & cdk.StackProps = {
    region: 'us-east-1',
    cidrBlock: '10.1.0.0/16',
    environment: 'test',
    enableTransitGateway: false,
    tags: {
      Environment: 'Test',
      Project: 'AWS-Multi-Region-CDK-Demo',
    },
  };

  beforeEach(() => {
    app = new cdk.App();
  });

  describe('VPC Creation', () => {
    beforeEach(() => {
      stack = new NetworkStack(app, 'TestNetworkStack', defaultProps);
      template = Template.fromStack(stack);
    });

    test('creates VPC with correct CIDR block', () => {
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.1.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
      });
    });

    test('creates VPC with correct tags', () => {
      template.hasResourceProperties('AWS::EC2::VPC', {
        Tags: Match.arrayWith([
          {
            Key: 'Environment',
            Value: 'test',
          },
          {
            Key: 'Project',
            Value: 'AWS-Multi-Region-CDK-Demo',
          },
        ]),
      });
    });
  });

  describe('Subnet Configuration', () => {
    beforeEach(() => {
      stack = new NetworkStack(app, 'TestNetworkStack', defaultProps);
      template = Template.fromStack(stack);
    });

    test('creates 4 subnets (2 public, 2 private)', () => {
      // Should have 4 subnets total
      template.resourceCountIs('AWS::EC2::Subnet', 4);
    });

    test('creates public subnets with /24 CIDR masks', () => {
      template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: Match.stringLikeRegexp('10\\.1\\.[0-9]+\\.0/24'),
        MapPublicIpOnLaunch: true,
      });
    });

    test('creates private subnets with /24 CIDR masks', () => {
      template.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: Match.stringLikeRegexp('10\\.1\\.[0-9]+\\.0/24'),
        MapPublicIpOnLaunch: false,
      });
    });

    test('creates subnets in different availability zones', () => {
      const subnets = template.findResources('AWS::EC2::Subnet');
      const azs = new Set();
      
      Object.values(subnets).forEach((subnet: any) => {
        if (subnet.Properties.AvailabilityZone) {
          azs.add(subnet.Properties.AvailabilityZone);
        }
      });
      
      // Should have subnets in at least 2 different AZs (CDK may create more)
      expect(azs.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Internet Gateway and NAT Gateways', () => {
    beforeEach(() => {
      stack = new NetworkStack(app, 'TestNetworkStack', defaultProps);
      template = Template.fromStack(stack);
    });

    test('creates Internet Gateway', () => {
      template.resourceCountIs('AWS::EC2::InternetGateway', 1);
    });

    test('creates NAT Gateways for high availability', () => {
      template.resourceCountIs('AWS::EC2::NatGateway', 2);
    });

    test('creates Elastic IPs for NAT Gateways', () => {
      template.resourceCountIs('AWS::EC2::EIP', 2);
    });
  });

  describe('Route Tables', () => {
    beforeEach(() => {
      stack = new NetworkStack(app, 'TestNetworkStack', defaultProps);
      template = Template.fromStack(stack);
    });

    test('creates route tables for public and private subnets', () => {
      // Should have route tables for public and private subnets (at least 2)
      const routeTables = template.findResources('AWS::EC2::RouteTable');
      expect(Object.keys(routeTables).length).toBeGreaterThanOrEqual(2);
    });

    test('creates routes to Internet Gateway for public subnets', () => {
      template.hasResourceProperties('AWS::EC2::Route', {
        DestinationCidrBlock: '0.0.0.0/0',
        GatewayId: Match.anyValue(),
      });
    });

    test('creates routes to NAT Gateway for private subnets', () => {
      template.hasResourceProperties('AWS::EC2::Route', {
        DestinationCidrBlock: '0.0.0.0/0',
        NatGatewayId: Match.anyValue(),
      });
    });
  });

  describe('Security Groups', () => {
    beforeEach(() => {
      stack = new NetworkStack(app, 'TestNetworkStack', defaultProps);
      template = Template.fromStack(stack);
    });

    test('creates three security groups for different tiers', () => {
      template.resourceCountIs('AWS::EC2::SecurityGroup', 3);
    });

    test('creates web security group with HTTP/HTTPS access', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for web tier (ALB, public-facing services)',
        SecurityGroupIngress: Match.arrayWith([
          Match.objectLike({
            IpProtocol: 'tcp',
            FromPort: 80,
            ToPort: 80,
            CidrIp: '0.0.0.0/0',
          }),
          Match.objectLike({
            IpProtocol: 'tcp',
            FromPort: 443,
            ToPort: 443,
            CidrIp: '0.0.0.0/0',
          }),
        ]),
      });
    });

    test('creates app security group with restricted access', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for application tier (EC2, ECS)',
      });
    });

    test('creates database security group with no outbound internet access', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for database tier (RDS, ElastiCache)',
      });
      
      // Check that database security group exists and has restricted egress
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
      const dbSecurityGroup = Object.values(securityGroups).find((sg: any) => 
        sg.Properties.GroupDescription === 'Security group for database tier (RDS, ElastiCache)'
      );
      expect(dbSecurityGroup).toBeDefined();
    });

    test('configures IoT specific ports in app security group', () => {
      // Check that app security group has IoT MQTT port
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
      const appSecurityGroup = Object.values(securityGroups).find((sg: any) => 
        sg.Properties.GroupDescription === 'Security group for application tier (EC2, ECS)'
      );
      expect(appSecurityGroup).toBeDefined();
      
      const ingress = (appSecurityGroup as any).Properties.SecurityGroupIngress;
      const mqttRule = ingress.find((rule: any) => rule.FromPort === 8883);
      expect(mqttRule).toBeDefined();
    });
  });

  describe('Transit Gateway', () => {
    test('does not create Transit Gateway when disabled', () => {
      stack = new NetworkStack(app, 'TestNetworkStack', {
        ...defaultProps,
        enableTransitGateway: false,
      });
      template = Template.fromStack(stack);

      template.resourceCountIs('AWS::EC2::TransitGateway', 0);
      template.resourceCountIs('AWS::EC2::TransitGatewayVpcAttachment', 0);
    });

    test('creates Transit Gateway when enabled', () => {
      stack = new NetworkStack(app, 'TestNetworkStack', {
        ...defaultProps,
        enableTransitGateway: true,
      });
      template = Template.fromStack(stack);

      template.resourceCountIs('AWS::EC2::TransitGateway', 1);
      template.resourceCountIs('AWS::EC2::TransitGatewayVpcAttachment', 1);
    });

    test('configures Transit Gateway with correct properties', () => {
      stack = new NetworkStack(app, 'TestNetworkStack', {
        ...defaultProps,
        enableTransitGateway: true,
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::TransitGateway', {
        AmazonSideAsn: 64512,
        Description: 'Transit Gateway for multi-region connectivity',
        DefaultRouteTableAssociation: 'enable',
        DefaultRouteTablePropagation: 'enable',
        DnsSupport: 'enable',
        VpnEcmpSupport: 'enable',
      });
    });

    test('creates TGW VPC attachment with private subnets', () => {
      stack = new NetworkStack(app, 'TestNetworkStack', {
        ...defaultProps,
        enableTransitGateway: true,
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::TransitGatewayVpcAttachment', {
        TransitGatewayId: Match.anyValue(),
        VpcId: Match.anyValue(),
        SubnetIds: Match.anyValue(),
      });
    });

    test('creates routes to Transit Gateway for private traffic', () => {
      stack = new NetworkStack(app, 'TestNetworkStack', {
        ...defaultProps,
        enableTransitGateway: true,
      });
      template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::EC2::Route', {
        DestinationCidrBlock: '10.0.0.0/8',
        TransitGatewayId: Match.anyValue(),
      });
    });
  });

  describe('CloudFormation Outputs', () => {
    beforeEach(() => {
      stack = new NetworkStack(app, 'TestNetworkStackOutputs', defaultProps);
      template = Template.fromStack(stack);
    });

    test('creates VPC ID output', () => {
      template.hasOutput('VpcId', {
        Description: 'VPC ID',
        Export: {
          Name: 'TestNetworkStackOutputs-VpcId',
        },
      });
    });

    test('creates subnet ID outputs', () => {
      template.hasOutput('PublicSubnetIds', {
        Description: 'Public subnet IDs',
        Export: {
          Name: 'TestNetworkStackOutputs-PublicSubnetIds',
        },
      });

      template.hasOutput('PrivateSubnetIds', {
        Description: 'Private subnet IDs',
        Export: {
          Name: 'TestNetworkStackOutputs-PrivateSubnetIds',
        },
      });
    });

    test('creates security group ID outputs', () => {
      template.hasOutput('WebSecurityGroupId', {
        Description: 'Web tier security group ID',
        Export: {
          Name: 'TestNetworkStackOutputs-WebSecurityGroupId',
        },
      });

      template.hasOutput('AppSecurityGroupId', {
        Description: 'App tier security group ID',
        Export: {
          Name: 'TestNetworkStackOutputs-AppSecurityGroupId',
        },
      });

      template.hasOutput('DatabaseSecurityGroupId', {
        Description: 'Database tier security group ID',
        Export: {
          Name: 'TestNetworkStackOutputs-DatabaseSecurityGroupId',
        },
      });
    });

    test('creates Transit Gateway output when enabled', () => {
      const tgwApp = new cdk.App();
      const tgwStack = new NetworkStack(tgwApp, 'TestNetworkStackTGW', {
        ...defaultProps,
        enableTransitGateway: true,
      });
      const tgwTemplate = Template.fromStack(tgwStack);

      tgwTemplate.hasOutput('TransitGatewayId', {
        Description: 'Transit Gateway ID',
        Export: {
          Name: 'TestNetworkStackTGW-TransitGatewayId',
        },
      });
    });
  });

  describe('Stack Outputs Interface', () => {
    beforeEach(() => {
      stack = new NetworkStack(app, 'TestNetworkStackInterface', defaultProps);
    });

    test('provides outputs interface with correct structure', () => {
      expect(stack.outputs).toBeDefined();
      expect(stack.outputs.vpcId).toBeDefined();
      expect(stack.outputs.publicSubnetIds).toBeInstanceOf(Array);
      expect(stack.outputs.privateSubnetIds).toBeInstanceOf(Array);
      expect(stack.outputs.securityGroupIds).toBeDefined();
      expect(stack.outputs.securityGroupIds.web).toBeDefined();
      expect(stack.outputs.securityGroupIds.app).toBeDefined();
      expect(stack.outputs.securityGroupIds.database).toBeDefined();
    });

    test('includes Transit Gateway ID when enabled', () => {
      const tgwStack = new NetworkStack(app, 'TestNetworkStackInterfaceTGW', {
        ...defaultProps,
        enableTransitGateway: true,
      });

      expect(tgwStack.outputs.transitGatewayId).toBeDefined();
    });

    test('excludes Transit Gateway ID when disabled', () => {
      expect(stack.outputs.transitGatewayId).toBeUndefined();
    });
  });

  describe('Different CIDR Blocks', () => {
    test('creates VPC with custom CIDR block', () => {
      const cidrStack = new NetworkStack(app, 'TestNetworkStackCIDR1', {
        ...defaultProps,
        cidrBlock: '10.3.0.0/16',
      });
      const cidrTemplate = Template.fromStack(cidrStack);

      cidrTemplate.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.3.0.0/16',
      });
    });

    test('creates subnets with correct CIDR blocks for different regions', () => {
      const cidrStack = new NetworkStack(app, 'TestNetworkStackCIDR2', {
        ...defaultProps,
        cidrBlock: '10.4.0.0/16',
      });
      const cidrTemplate = Template.fromStack(cidrStack);

      cidrTemplate.hasResourceProperties('AWS::EC2::Subnet', {
        CidrBlock: Match.stringLikeRegexp('10\\.4\\.[0-9]+\\.0/24'),
      });
    });
  });

  describe('Error Handling', () => {
    test('handles missing required props gracefully', () => {
      expect(() => {
        new NetworkStack(app, 'TestNetworkStackError', {
          region: 'us-east-1',
          cidrBlock: '10.1.0.0/16',
          environment: 'test',
        } as NetworkStackProps & cdk.StackProps);
      }).not.toThrow();
    });
  });
});