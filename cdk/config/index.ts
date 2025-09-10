/**
 * Configuration module exports for AWS Multi-Region CDK Demo
 */

// Export all types
export * from './types';

// Export region configurations and utilities
export * from './regions';

// Export configuration management classes
export * from './config-manager';

// Re-export commonly used configurations
export {
  DEFAULT_REGIONS,
  DEFAULT_DEPLOYMENT_CONFIG,
  getRegionConfig,
  getAllRegions,
  getEnvironmentRegions,
  validateCidrBlocks
} from './regions';

// Re-export configuration management classes
export {
  ConfigurationManager,
  ConfigurationLoader,
  ConfigurationValidator
} from './config-manager';