/**
 * Example usage of Configuration Manager
 * This file demonstrates how to use the configuration management system
 */

import {
  ConfigurationManager,
  ConfigurationLoader,
  ConfigurationValidator,
  RegionConfig,
  DeploymentConfig,
} from './index';

// Example 1: Basic usage with default configuration
function basicUsageExample () {
  console.log('=== Basic Configuration Manager Usage ===');

  // Initialize configuration manager for development environment
  const configManager = new ConfigurationManager('development');

  // Get environment configuration
  const envConfig = configManager.getEnvironmentConfig();
  console.log('Environment:', envConfig.stackNaming);

  // Get regions for different deployments
  const iotRegions = configManager.getIoTRegions();
  console.log(
    'IoT Regions:',
    iotRegions.map(r => r.regionName)
  );

  const paymentRegions = configManager.getPaymentRegions();
  console.log(
    'Payment Regions:',
    paymentRegions.map(r => r.regionName)
  );

  // Generate stack names
  const networkStackName = configManager.generateStackName('Network', 'us-east-1');
  console.log('Network Stack Name:', networkStackName);

  // Check Transit Gateway configuration
  const shouldEnableTGW = configManager.shouldEnableTransitGateway('us-east-1');
  console.log('Enable TGW for us-east-1:', shouldEnableTGW);
}

// Example 2: Production environment usage
function productionUsageExample () {
  console.log('\n=== Production Environment Usage ===');

  const prodManager = new ConfigurationManager('production');

  // Get all regions for production
  const prodRegions = prodManager.getEnvironmentRegions();
  console.log(
    'Production Regions:',
    prodRegions.map(r => r.regionName)
  );

  // Get region-specific configuration
  const usEastConfig = prodManager.getRegionConfig('us-east-1');
  console.log('US East Config:', {
    cidr: usEastConfig.cidrBlock,
    deployIoT: usEastConfig.deployIoT,
    deployPayment: usEastConfig.deployPayment,
  });

  // Get common tags for production
  const tags = prodManager.getCommonTags();
  console.log('Production Tags:', tags);
}

// Example 3: Custom configuration
function customConfigurationExample () {
  console.log('\n=== Custom Configuration Usage ===');

  // Create a custom configuration
  const customConfig: DeploymentConfig = {
    environments: {
      staging: {
        regions: [
          {
            regionName: 'us-west-2',
            cidrBlock: '10.5.0.0/16',
            availabilityZones: ['us-west-2a', 'us-west-2b'],
            deployIoT: true,
            deployPayment: true,
            deployDemo: false,
            instanceTypes: {
              iot: 't3.small',
              payment: 't3.medium',
            },
            databaseConfig: {
              iot: {
                instanceClass: 'db.t3.micro',
                allocatedStorage: 20,
                multiAz: false,
                backupRetentionPeriod: 3,
                encrypted: true,
              },
              payment: {
                instanceClass: 'db.t3.small',
                allocatedStorage: 50,
                multiAz: false,
                backupRetentionPeriod: 7,
                encrypted: true,
              },
            },
          },
        ],
        stackNaming: {
          prefix: 'Staging',
          suffix: 'Stack',
        },
        tags: {
          Environment: 'Staging',
          Project: 'Multi-Region-Demo',
        },
        settings: {
          enableCdkNag: true,
          enableDetailedMonitoring: false,
          costOptimization: {
            useSpotInstances: true,
            enableAutoScaling: true,
          },
        },
      },
    },
    crossRegionSettings: {
      enableTransitGateway: false,
      paymentApiEndpoint: 'https://staging-payment-api.com',
      primaryRegion: 'us-west-2',
    },
  };

  // Initialize with custom configuration
  const stagingManager = new ConfigurationManager('staging', customConfig);

  const stagingRegions = stagingManager.getEnvironmentRegions();
  console.log(
    'Staging Regions:',
    stagingRegions.map(r => r.regionName)
  );

  const stackName = stagingManager.generateStackName('IoT', 'us-west-2');
  console.log('Staging Stack Name:', stackName);
}

// Example 4: Configuration validation
function validationExample () {
  console.log('\n=== Configuration Validation Usage ===');

  // Validate CIDR blocks
  const validCidr = '10.1.0.0/16';
  const invalidCidr = '256.1.0.0/16';

  console.log(`${validCidr} is valid:`, ConfigurationValidator.validateCidrBlock(validCidr));
  console.log(`${invalidCidr} is valid:`, ConfigurationValidator.validateCidrBlock(invalidCidr));

  // Validate region names
  const validRegion = 'us-east-1';
  const invalidRegion = 'invalid-region';

  console.log(`${validRegion} is valid:`, ConfigurationValidator.validateRegionName(validRegion));
  console.log(
    `${invalidRegion} is valid:`,
    ConfigurationValidator.validateRegionName(invalidRegion)
  );

  // Validate instance types
  const validInstance = 't3.micro';
  const invalidInstance = 'invalid-type';

  console.log(
    `${validInstance} is valid:`,
    ConfigurationValidator.validateInstanceType(validInstance)
  );
  console.log(
    `${invalidInstance} is valid:`,
    ConfigurationValidator.validateInstanceType(invalidInstance)
  );

  // Check CIDR overlap
  const cidr1 = '10.1.0.0/16';
  const cidr2 = '10.2.0.0/16';
  const cidr3 = '10.1.5.0/24';

  console.log(
    `${cidr1} and ${cidr2} overlap:`,
    ConfigurationValidator.cidrBlocksOverlap(cidr1, cidr2)
  );
  console.log(
    `${cidr1} and ${cidr3} overlap:`,
    ConfigurationValidator.cidrBlocksOverlap(cidr1, cidr3)
  );
}

// Example 5: Configuration loading and merging
function loadingExample () {
  console.log('\n=== Configuration Loading Usage ===');

  // Load from environment (uses CDK_ENVIRONMENT env var)
  const envConfig = ConfigurationLoader.loadFromEnvironment();
  console.log('Loaded environment:', Object.keys(envConfig.environments));

  // Merge configurations
  const baseConfig = envConfig;
  const overrideConfig = {
    crossRegionSettings: {
      enableTransitGateway: false,
      paymentApiEndpoint: 'https://override-api.com',
      primaryRegion: 'us-east-1',
    },
  };

  const mergedConfig = ConfigurationLoader.mergeConfigurations(baseConfig, overrideConfig);
  console.log('Merged TGW setting:', mergedConfig.crossRegionSettings.enableTransitGateway);
  console.log('Merged API endpoint:', mergedConfig.crossRegionSettings.paymentApiEndpoint);
}

// Run examples if this file is executed directly
if (require.main === module) {
  try {
    basicUsageExample();
    productionUsageExample();
    customConfigurationExample();
    validationExample();
    loadingExample();
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}
