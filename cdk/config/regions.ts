/**
 * Region-specific configuration for AWS Multi-Region CDK Demo
 */

import { RegionConfig, DeploymentConfig } from './types';

/**
 * Default region configurations for the multi-region demo
 */
export const DEFAULT_REGIONS: { [key: string]: RegionConfig } = {
  'us-east-1': {
    regionName: 'us-east-1',
    cidrBlock: '10.1.0.0/16',
    availabilityZones: ['us-east-1a', 'us-east-1b'],
    deployIoT: true,
    deployPayment: true,
    deployDemo: true,
    instanceTypes: {
      iot: 't3.medium',
      payment: 't3.large'
    },
    databaseConfig: {
      iot: {
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        multiAz: true,
        backupRetentionPeriod: 7,
        engineVersion: '8.0.35',
        encrypted: true
      },
      payment: {
        instanceClass: 'db.t3.small',
        allocatedStorage: 100,
        multiAz: true,
        backupRetentionPeriod: 30,
        engineVersion: '8.0.35',
        encrypted: true
      }
    }
  },
  
  'eu-central-1': {
    regionName: 'eu-central-1',
    cidrBlock: '10.3.0.0/16',
    availabilityZones: ['eu-central-1a', 'eu-central-1b'],
    deployIoT: true,
    deployPayment: false,
    deployDemo: false,
    instanceTypes: {
      iot: 't3.medium',
      payment: 't3.large'
    },
    databaseConfig: {
      iot: {
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        multiAz: true,
        backupRetentionPeriod: 7,
        engineVersion: '8.0.35',
        encrypted: true
      },
      payment: {
        instanceClass: 'db.t3.small',
        allocatedStorage: 100,
        multiAz: true,
        backupRetentionPeriod: 30,
        engineVersion: '8.0.35',
        encrypted: true
      }
    }
  },
  
  'ap-southeast-2': {
    regionName: 'ap-southeast-2',
    cidrBlock: '10.4.0.0/16',
    availabilityZones: ['ap-southeast-2a', 'ap-southeast-2b'],
    deployIoT: true,
    deployPayment: false,
    deployDemo: false,
    instanceTypes: {
      iot: 't3.medium',
      payment: 't3.large'
    },
    databaseConfig: {
      iot: {
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        multiAz: true,
        backupRetentionPeriod: 7,
        engineVersion: '8.0.35',
        encrypted: true
      },
      payment: {
        instanceClass: 'db.t3.small',
        allocatedStorage: 100,
        multiAz: true,
        backupRetentionPeriod: 30,
        engineVersion: '8.0.35',
        encrypted: true
      }
    }
  }
};

/**
 * Default deployment configuration
 */
export const DEFAULT_DEPLOYMENT_CONFIG: DeploymentConfig = {
  environments: {
    development: {
      regions: [
        DEFAULT_REGIONS['us-east-1']
      ],
      stackNaming: {
        prefix: 'MultiRegionDemo',
        suffix: 'Dev'
      },
      tags: {
        Environment: 'Development',
        Project: 'AWS-Multi-Region-CDK-Demo',
        Owner: 'DevOps-Team',
        CostCenter: 'Engineering'
      },
      settings: {
        enableCdkNag: true,
        enableDetailedMonitoring: false,
        costOptimization: {
          useSpotInstances: true,
          enableAutoScaling: true
        }
      }
    },
    
    production: {
      regions: [
        DEFAULT_REGIONS['us-east-1'],
        DEFAULT_REGIONS['eu-central-1'],
        DEFAULT_REGIONS['ap-southeast-2']
      ],
      stackNaming: {
        prefix: 'MultiRegionDemo',
        suffix: 'Prod'
      },
      tags: {
        Environment: 'Production',
        Project: 'AWS-Multi-Region-CDK-Demo',
        Owner: 'DevOps-Team',
        CostCenter: 'Engineering'
      },
      settings: {
        enableCdkNag: true,
        enableDetailedMonitoring: true,
        costOptimization: {
          useSpotInstances: false,
          enableAutoScaling: true
        }
      }
    }
  },
  
  crossRegionSettings: {
    enableTransitGateway: true,
    paymentApiEndpoint: 'https://payment-api.us-east-1.amazonaws.com',
    primaryRegion: 'us-east-1'
  }
};

/**
 * Utility function to get region configuration by name
 */
export function getRegionConfig(regionName: string): RegionConfig {
  const config = DEFAULT_REGIONS[regionName];
  if (!config) {
    throw new Error(`Region configuration not found for: ${regionName}`);
  }
  return config;
}

/**
 * Utility function to get all configured regions
 */
export function getAllRegions(): RegionConfig[] {
  return Object.values(DEFAULT_REGIONS);
}

/**
 * Utility function to get regions for a specific environment
 */
export function getEnvironmentRegions(environment: string): RegionConfig[] {
  const envConfig = DEFAULT_DEPLOYMENT_CONFIG.environments[environment];
  if (!envConfig) {
    throw new Error(`Environment configuration not found for: ${environment}`);
  }
  return envConfig.regions;
}

/**
 * Utility function to validate CIDR blocks don't overlap
 */
export function validateCidrBlocks(regions: RegionConfig[]): boolean {
  const cidrBlocks = regions.map(r => r.cidrBlock);
  const uniqueCidrBlocks = new Set(cidrBlocks);
  
  if (cidrBlocks.length !== uniqueCidrBlocks.size) {
    throw new Error('Overlapping CIDR blocks detected in region configuration');
  }
  
  return true;
}