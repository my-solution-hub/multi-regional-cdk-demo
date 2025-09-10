/**
 * Core configuration types for AWS Multi-Region CDK Demo
 */

export interface RegionConfig {
  /** AWS region name (e.g., 'us-east-1', 'eu-central-1') */
  regionName: string;
  
  /** VPC CIDR block for this region (e.g., '10.1.0.0/16') */
  cidrBlock: string;
  
  /** List of availability zones to use in this region */
  availabilityZones: string[];
  
  /** Whether to deploy IoT stack in this region */
  deployIoT: boolean;
  
  /** Whether to deploy Payment stack in this region */
  deployPayment: boolean;
  
  /** Whether to deploy Demo stack in this region */
  deployDemo: boolean;
  
  /** Instance types for different application tiers */
  instanceTypes: {
    iot: string;
    payment: string;
  };
  
  /** Database configuration for different applications */
  databaseConfig: {
    iot: DatabaseConfig;
    payment: DatabaseConfig;
  };
}

export interface DatabaseConfig {
  /** RDS instance class (e.g., 'db.t3.micro', 'db.r5.large') */
  instanceClass: string;
  
  /** Allocated storage in GB */
  allocatedStorage: number;
  
  /** Enable Multi-AZ deployment */
  multiAz: boolean;
  
  /** Backup retention period in days */
  backupRetentionPeriod: number;
  
  /** Database engine version */
  engineVersion?: string;
  
  /** Enable encryption at rest */
  encrypted?: boolean;
}

export interface DeploymentConfig {
  /** Environment-specific configurations */
  environments: {
    [environmentName: string]: EnvironmentConfig;
  };
  
  /** Cross-region connectivity settings */
  crossRegionSettings: {
    /** Enable Transit Gateway for cross-region connectivity */
    enableTransitGateway: boolean;
    
    /** Payment API endpoint for cross-region access */
    paymentApiEndpoint: string;
    
    /** Primary region for centralized services */
    primaryRegion: string;
  };
}

export interface EnvironmentConfig {
  /** List of regions to deploy to */
  regions: RegionConfig[];
  
  /** Stack naming configuration */
  stackNaming: {
    prefix: string;
    suffix: string;
  };
  
  /** Common tags to apply to all resources */
  tags: {
    [key: string]: string;
  };
  
  /** Environment-specific settings */
  settings: {
    /** Enable CDK Nag security validation */
    enableCdkNag: boolean;
    
    /** Enable detailed monitoring */
    enableDetailedMonitoring: boolean;
    
    /** Cost optimization settings */
    costOptimization: {
      useSpotInstances: boolean;
      enableAutoScaling: boolean;
    };
  };
}

export interface NetworkStackProps {
  /** AWS region for deployment */
  region: string;
  
  /** VPC CIDR block */
  cidrBlock: string;
  
  /** Enable Transit Gateway (US region only) */
  enableTransitGateway?: boolean;
  
  /** Environment name for resource naming */
  environment: string;
  
  /** Common tags */
  tags?: { [key: string]: string };
}

export interface NetworkStackOutputs {
  /** VPC ID */
  vpcId: string;
  
  /** Public subnet IDs */
  publicSubnetIds: string[];
  
  /** Private subnet IDs */
  privateSubnetIds: string[];
  
  /** Security group IDs by tier */
  securityGroupIds: {
    web: string;
    app: string;
    database: string;
  };
  
  /** Transit Gateway ID (if enabled) */
  transitGatewayId?: string;
}

export interface IoTStackProps {
  /** Network stack reference */
  networkStackOutputs: NetworkStackOutputs;
  
  /** AWS region */
  region: string;
  
  /** EC2 instance type */
  instanceType?: string;
  
  /** Database configuration */
  databaseConfig: DatabaseConfig;
  
  /** Environment name */
  environment: string;
  
  /** Common tags */
  tags?: { [key: string]: string };
}

export interface IoTStackOutputs {
  /** Application Load Balancer DNS name */
  loadBalancerDnsName: string;
  
  /** IoT Core endpoint */
  iotEndpoint: string;
  
  /** Database endpoint */
  databaseEndpoint: string;
  
  /** Auto Scaling Group ARN */
  autoScalingGroupArn: string;
}

export interface PaymentStackProps {
  /** Network stack reference */
  networkStackOutputs: NetworkStackOutputs;
  
  /** Container image URI */
  containerImage?: string;
  
  /** Database configuration */
  databaseConfig: DatabaseConfig;
  
  /** Cache configuration */
  cacheConfig: {
    nodeType: string;
    numCacheNodes: number;
  };
  
  /** Environment name */
  environment: string;
  
  /** Common tags */
  tags?: { [key: string]: string };
}

export interface PaymentStackOutputs {
  /** API endpoint for cross-region access */
  apiEndpoint: string;
  
  /** ECS cluster ARN */
  ecsClusterArn: string;
  
  /** Database endpoint */
  databaseEndpoint: string;
  
  /** Cache endpoint */
  cacheEndpoint: string;
  
  /** Network Load Balancer ARN */
  networkLoadBalancerArn: string;
}

export interface DemoStackProps {
  /** Payment stack reference */
  paymentStackOutputs: PaymentStackOutputs;
  
  /** Network stack reference */
  networkStackOutputs: NetworkStackOutputs;
  
  /** Java application container image */
  javaAppImage: string;
  
  /** Environment name */
  environment: string;
  
  /** Common tags */
  tags?: { [key: string]: string };
}

export interface DemoStackOutputs {
  /** Application URL */
  applicationUrl: string;
  
  /** ECS service ARN */
  ecsServiceArn: string;
  
  /** Application Load Balancer ARN */
  loadBalancerArn: string;
}