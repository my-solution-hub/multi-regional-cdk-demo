/**
 * Unit tests for Configuration Manager
 */

import {
  ConfigurationManager,
  ConfigurationLoader,
  ConfigurationValidator,
  DeploymentConfig,
  RegionConfig,
  DEFAULT_DEPLOYMENT_CONFIG,
  DEFAULT_REGIONS
} from '../config';

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    configManager = new ConfigurationManager('development');
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(configManager.getDeploymentConfig()).toEqual(DEFAULT_DEPLOYMENT_CONFIG);
    });

    it('should initialize with custom configuration', () => {
      const customConfig: DeploymentConfig = {
        environments: {
          test: {
            regions: [DEFAULT_REGIONS['us-east-1']],
            stackNaming: { prefix: 'Test', suffix: 'Stack' },
            tags: { Environment: 'Test' },
            settings: {
              enableCdkNag: false,
              enableDetailedMonitoring: false,
              costOptimization: { useSpotInstances: false, enableAutoScaling: false }
            }
          }
        },
        crossRegionSettings: {
          enableTransitGateway: false,
          paymentApiEndpoint: 'https://test-api.com',
          primaryRegion: 'us-east-1'
        }
      };

      const testManager = new ConfigurationManager('test', customConfig);
      expect(testManager.getDeploymentConfig()).toEqual(customConfig);
    });

    it('should throw error for invalid environment', () => {
      expect(() => {
        new ConfigurationManager('invalid-env');
      }).toThrow('Current environment \'invalid-env\' not found in configuration');
    });
  });

  describe('getEnvironmentConfig', () => {
    it('should return current environment config', () => {
      const envConfig = configManager.getEnvironmentConfig();
      expect(envConfig).toEqual(DEFAULT_DEPLOYMENT_CONFIG.environments.development);
    });

    it('should return specific environment config', () => {
      const prodConfig = configManager.getEnvironmentConfig('production');
      expect(prodConfig).toEqual(DEFAULT_DEPLOYMENT_CONFIG.environments.production);
    });

    it('should throw error for non-existent environment', () => {
      expect(() => {
        configManager.getEnvironmentConfig('non-existent');
      }).toThrow('Environment configuration not found for: non-existent');
    });
  });

  describe('getRegionConfig', () => {
    it('should return region config from current environment', () => {
      const regionConfig = configManager.getRegionConfig('us-east-1');
      expect(regionConfig.regionName).toBe('us-east-1');
      expect(regionConfig.cidrBlock).toBe('10.1.0.0/16');
    });

    it('should fallback to default regions', () => {
      const prodManager = new ConfigurationManager('production');
      const regionConfig = prodManager.getRegionConfig('eu-central-1');
      expect(regionConfig.regionName).toBe('eu-central-1');
    });

    it('should throw error for non-existent region', () => {
      expect(() => {
        configManager.getRegionConfig('non-existent-region');
      }).toThrow('Region configuration not found for: non-existent-region');
    });
  });

  describe('getEnvironmentRegions', () => {
    it('should return regions for current environment', () => {
      const regions = configManager.getEnvironmentRegions();
      expect(regions).toHaveLength(1);
      expect(regions[0].regionName).toBe('us-east-1');
    });

    it('should return regions for specific environment', () => {
      const prodRegions = configManager.getEnvironmentRegions('production');
      expect(prodRegions).toHaveLength(3);
      expect(prodRegions.map(r => r.regionName)).toEqual([
        'us-east-1',
        'eu-central-1',
        'ap-southeast-2'
      ]);
    });
  });

  describe('filtered region getters', () => {
    let prodManager: ConfigurationManager;

    beforeEach(() => {
      prodManager = new ConfigurationManager('production');
    });

    it('should return IoT regions', () => {
      const iotRegions = prodManager.getIoTRegions();
      expect(iotRegions).toHaveLength(3);
      expect(iotRegions.every(r => r.deployIoT)).toBe(true);
    });

    it('should return Payment regions', () => {
      const paymentRegions = prodManager.getPaymentRegions();
      expect(paymentRegions).toHaveLength(1);
      expect(paymentRegions[0].regionName).toBe('us-east-1');
      expect(paymentRegions[0].deployPayment).toBe(true);
    });

    it('should return Demo regions', () => {
      const demoRegions = prodManager.getDemoRegions();
      expect(demoRegions).toHaveLength(1);
      expect(demoRegions[0].regionName).toBe('us-east-1');
      expect(demoRegions[0].deployDemo).toBe(true);
    });
  });

  describe('getPrimaryRegion', () => {
    it('should return primary region', () => {
      const primaryRegion = configManager.getPrimaryRegion();
      expect(primaryRegion).toBe('us-east-1');
    });
  });

  describe('shouldEnableTransitGateway', () => {
    it('should return true for primary region when TGW is enabled', () => {
      const shouldEnable = configManager.shouldEnableTransitGateway('us-east-1');
      expect(shouldEnable).toBe(true);
    });

    it('should return false for non-primary region', () => {
      const shouldEnable = configManager.shouldEnableTransitGateway('eu-central-1');
      expect(shouldEnable).toBe(false);
    });
  });

  describe('getStackNaming', () => {
    it('should return stack naming configuration', () => {
      const naming = configManager.getStackNaming();
      expect(naming).toEqual({
        prefix: 'MultiRegionDemo',
        suffix: 'Dev'
      });
    });
  });

  describe('getCommonTags', () => {
    it('should return common tags', () => {
      const tags = configManager.getCommonTags();
      expect(tags).toEqual({
        Environment: 'Development',
        Project: 'AWS-Multi-Region-CDK-Demo',
        Owner: 'DevOps-Team',
        CostCenter: 'Engineering'
      });
    });
  });

  describe('generateStackName', () => {
    it('should generate proper stack name', () => {
      const stackName = configManager.generateStackName('Network', 'us-east-1');
      expect(stackName).toBe('MultiRegionDemo-Network-us-east-1-Dev');
    });
  });

  describe('configuration validation', () => {
    it('should validate overlapping CIDR blocks', () => {
      const invalidConfig: DeploymentConfig = {
        environments: {
          test: {
            regions: [
              { ...DEFAULT_REGIONS['us-east-1'], cidrBlock: '10.1.0.0/16' },
              { ...DEFAULT_REGIONS['eu-central-1'], cidrBlock: '10.1.0.0/16' } // Same CIDR
            ],
            stackNaming: { prefix: 'Test', suffix: 'Stack' },
            tags: {},
            settings: {
              enableCdkNag: false,
              enableDetailedMonitoring: false,
              costOptimization: { useSpotInstances: false, enableAutoScaling: false }
            }
          }
        },
        crossRegionSettings: {
          enableTransitGateway: false,
          paymentApiEndpoint: 'https://test.com',
          primaryRegion: 'us-east-1'
        }
      };

      expect(() => {
        new ConfigurationManager('test', invalidConfig);
      }).toThrow('Overlapping CIDR blocks detected');
    });

    it('should validate primary region has payment deployment', () => {
      const invalidConfig: DeploymentConfig = {
        environments: {
          test: {
            regions: [
              { ...DEFAULT_REGIONS['us-east-1'], deployPayment: false } // Primary region without payment
            ],
            stackNaming: { prefix: 'Test', suffix: 'Stack' },
            tags: {},
            settings: {
              enableCdkNag: false,
              enableDetailedMonitoring: false,
              costOptimization: { useSpotInstances: false, enableAutoScaling: false }
            }
          }
        },
        crossRegionSettings: {
          enableTransitGateway: false,
          paymentApiEndpoint: 'https://test.com',
          primaryRegion: 'us-east-1'
        }
      };

      expect(() => {
        new ConfigurationManager('test', invalidConfig);
      }).toThrow('Primary region \'us-east-1\' must have payment deployment enabled');
    });

    it('should validate region name format', () => {
      const invalidConfig: DeploymentConfig = {
        environments: {
          test: {
            regions: [
              { ...DEFAULT_REGIONS['us-east-1'], regionName: 'invalid-region' }
            ],
            stackNaming: { prefix: 'Test', suffix: 'Stack' },
            tags: {},
            settings: {
              enableCdkNag: false,
              enableDetailedMonitoring: false,
              costOptimization: { useSpotInstances: false, enableAutoScaling: false }
            }
          }
        },
        crossRegionSettings: {
          enableTransitGateway: false,
          paymentApiEndpoint: 'https://test.com',
          primaryRegion: 'invalid-region' // Match the invalid region
        }
      };

      expect(() => {
        new ConfigurationManager('test', invalidConfig);
      }).toThrow('Invalid region name format: invalid-region');
    });

    it('should validate availability zones', () => {
      const invalidConfig: DeploymentConfig = {
        environments: {
          test: {
            regions: [
              { ...DEFAULT_REGIONS['us-east-1'], availabilityZones: ['us-east-1a'] } // Only one AZ
            ],
            stackNaming: { prefix: 'Test', suffix: 'Stack' },
            tags: {},
            settings: {
              enableCdkNag: false,
              enableDetailedMonitoring: false,
              costOptimization: { useSpotInstances: false, enableAutoScaling: false }
            }
          }
        },
        crossRegionSettings: {
          enableTransitGateway: false,
          paymentApiEndpoint: 'https://test.com',
          primaryRegion: 'us-east-1'
        }
      };

      expect(() => {
        new ConfigurationManager('test', invalidConfig);
      }).toThrow('Region us-east-1 must have at least 2 availability zones');
    });
  });
});

describe('ConfigurationLoader', () => {
  describe('loadFromEnvironment', () => {
    it('should load configuration from environment', () => {
      const originalEnv = process.env.CDK_ENVIRONMENT;
      process.env.CDK_ENVIRONMENT = 'development';
      
      const config = ConfigurationLoader.loadFromEnvironment();
      expect(config).toEqual(DEFAULT_DEPLOYMENT_CONFIG);
      
      process.env.CDK_ENVIRONMENT = originalEnv;
    });
  });

  describe('mergeConfigurations', () => {
    it('should merge configurations correctly', () => {
      const baseConfig = DEFAULT_DEPLOYMENT_CONFIG;
      const overrideConfig: Partial<DeploymentConfig> = {
        crossRegionSettings: {
          enableTransitGateway: false,
          paymentApiEndpoint: baseConfig.crossRegionSettings.paymentApiEndpoint,
          primaryRegion: baseConfig.crossRegionSettings.primaryRegion
        }
      };

      const merged = ConfigurationLoader.mergeConfigurations(baseConfig, overrideConfig);
      expect(merged.crossRegionSettings.enableTransitGateway).toBe(false);
      expect(merged.crossRegionSettings.primaryRegion).toBe(baseConfig.crossRegionSettings.primaryRegion);
    });
  });
});

describe('ConfigurationValidator', () => {
  describe('validateCidrBlock', () => {
    it('should validate correct CIDR blocks', () => {
      expect(ConfigurationValidator.validateCidrBlock('10.1.0.0/16')).toBe(true);
      expect(ConfigurationValidator.validateCidrBlock('192.168.1.0/24')).toBe(true);
      expect(ConfigurationValidator.validateCidrBlock('172.16.0.0/12')).toBe(true);
    });

    it('should reject invalid CIDR blocks', () => {
      expect(ConfigurationValidator.validateCidrBlock('invalid')).toBe(false);
      expect(ConfigurationValidator.validateCidrBlock('10.1.0.0/33')).toBe(false);
      expect(ConfigurationValidator.validateCidrBlock('256.1.0.0/16')).toBe(false);
      expect(ConfigurationValidator.validateCidrBlock('10.1.0.0/7')).toBe(false);
    });
  });

  describe('cidrBlocksOverlap', () => {
    it('should detect identical CIDR blocks', () => {
      expect(ConfigurationValidator.cidrBlocksOverlap('10.1.0.0/16', '10.1.0.0/16')).toBe(true);
    });

    it('should detect overlapping networks', () => {
      expect(ConfigurationValidator.cidrBlocksOverlap('10.1.0.0/16', '10.1.5.0/24')).toBe(true);
    });

    it('should not detect non-overlapping networks', () => {
      expect(ConfigurationValidator.cidrBlocksOverlap('10.1.0.0/16', '10.2.0.0/16')).toBe(false);
    });
  });

  describe('validateRegionName', () => {
    it('should validate correct region names', () => {
      expect(ConfigurationValidator.validateRegionName('us-east-1')).toBe(true);
      expect(ConfigurationValidator.validateRegionName('eu-central-1')).toBe(true);
      expect(ConfigurationValidator.validateRegionName('ap-southeast-2')).toBe(true);
    });

    it('should reject invalid region names', () => {
      expect(ConfigurationValidator.validateRegionName('invalid')).toBe(false);
      expect(ConfigurationValidator.validateRegionName('us-east')).toBe(false);
      expect(ConfigurationValidator.validateRegionName('US-EAST-1')).toBe(false);
    });
  });

  describe('validateAvailabilityZone', () => {
    it('should validate correct availability zones', () => {
      expect(ConfigurationValidator.validateAvailabilityZone('us-east-1a', 'us-east-1')).toBe(true);
      expect(ConfigurationValidator.validateAvailabilityZone('eu-central-1b', 'eu-central-1')).toBe(true);
    });

    it('should reject invalid availability zones', () => {
      expect(ConfigurationValidator.validateAvailabilityZone('us-west-1a', 'us-east-1')).toBe(false);
      expect(ConfigurationValidator.validateAvailabilityZone('invalid', 'us-east-1')).toBe(false);
    });
  });

  describe('validateInstanceType', () => {
    it('should validate correct instance types', () => {
      expect(ConfigurationValidator.validateInstanceType('t3.micro')).toBe(true);
      expect(ConfigurationValidator.validateInstanceType('m5.large')).toBe(true);
      expect(ConfigurationValidator.validateInstanceType('c5n.xlarge')).toBe(true);
    });

    it('should reject invalid instance types', () => {
      expect(ConfigurationValidator.validateInstanceType('invalid')).toBe(false);
      expect(ConfigurationValidator.validateInstanceType('T3.MICRO')).toBe(false);
      expect(ConfigurationValidator.validateInstanceType('t3')).toBe(false);
    });
  });

  describe('validateRdsInstanceClass', () => {
    it('should validate correct RDS instance classes', () => {
      expect(ConfigurationValidator.validateRdsInstanceClass('db.t3.micro')).toBe(true);
      expect(ConfigurationValidator.validateRdsInstanceClass('db.r5.large')).toBe(true);
      expect(ConfigurationValidator.validateRdsInstanceClass('db.m5.xlarge')).toBe(true);
    });

    it('should reject invalid RDS instance classes', () => {
      expect(ConfigurationValidator.validateRdsInstanceClass('t3.micro')).toBe(false);
      expect(ConfigurationValidator.validateRdsInstanceClass('db.invalid')).toBe(false);
      expect(ConfigurationValidator.validateRdsInstanceClass('DB.T3.MICRO')).toBe(false);
    });
  });
});