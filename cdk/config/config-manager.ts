/**
 * Configuration Manager for AWS Multi-Region CDK Demo
 * Provides centralized configuration loading, validation, and management
 */

import { RegionConfig, DeploymentConfig, EnvironmentConfig, DatabaseConfig } from './types';
import { DEFAULT_REGIONS, DEFAULT_DEPLOYMENT_CONFIG } from './regions';

export class ConfigurationManager {
  private deploymentConfig: DeploymentConfig;
  private currentEnvironment: string;

  constructor(environment: string = 'development', customConfig?: DeploymentConfig) {
    this.currentEnvironment = environment;
    this.deploymentConfig = customConfig || DEFAULT_DEPLOYMENT_CONFIG;
    this.validateConfiguration();
  }

  /**
   * Get the current deployment configuration
   */
  getDeploymentConfig(): DeploymentConfig {
    return this.deploymentConfig;
  }

  /**
   * Get configuration for a specific environment
   */
  getEnvironmentConfig(environment?: string): EnvironmentConfig {
    const env = environment || this.currentEnvironment;
    const config = this.deploymentConfig.environments[env];
    
    if (!config) {
      throw new Error(`Environment configuration not found for: ${env}`);
    }
    
    return config;
  }

  /**
   * Get region configuration by name
   */
  getRegionConfig(regionName: string): RegionConfig {
    // First check if region is in current environment
    const envConfig = this.getEnvironmentConfig();
    const regionInEnv = envConfig.regions.find(r => r.regionName === regionName);
    
    if (regionInEnv) {
      return regionInEnv;
    }
    
    // Fallback to default regions
    const defaultRegion = DEFAULT_REGIONS[regionName];
    if (!defaultRegion) {
      throw new Error(`Region configuration not found for: ${regionName}`);
    }
    
    return defaultRegion;
  }

  /**
   * Get all regions for current environment
   */
  getEnvironmentRegions(environment?: string): RegionConfig[] {
    const envConfig = this.getEnvironmentConfig(environment);
    return envConfig.regions;
  }

  /**
   * Get regions that should deploy IoT stack
   */
  getIoTRegions(environment?: string): RegionConfig[] {
    return this.getEnvironmentRegions(environment).filter(r => r.deployIoT);
  }

  /**
   * Get regions that should deploy Payment stack
   */
  getPaymentRegions(environment?: string): RegionConfig[] {
    return this.getEnvironmentRegions(environment).filter(r => r.deployPayment);
  }

  /**
   * Get regions that should deploy Demo stack
   */
  getDemoRegions(environment?: string): RegionConfig[] {
    return this.getEnvironmentRegions(environment).filter(r => r.deployDemo);
  }

  /**
   * Get the primary region (where centralized services are deployed)
   */
  getPrimaryRegion(): string {
    return this.deploymentConfig.crossRegionSettings.primaryRegion;
  }

  /**
   * Check if Transit Gateway should be enabled for a region
   */
  shouldEnableTransitGateway(regionName: string): boolean {
    return this.deploymentConfig.crossRegionSettings.enableTransitGateway && 
           regionName === this.getPrimaryRegion();
  }

  /**
   * Get stack naming configuration for environment
   */
  getStackNaming(environment?: string): { prefix: string; suffix: string } {
    const envConfig = this.getEnvironmentConfig(environment);
    return envConfig.stackNaming;
  }

  /**
   * Get common tags for environment
   */
  getCommonTags(environment?: string): { [key: string]: string } {
    const envConfig = this.getEnvironmentConfig(environment);
    return envConfig.tags;
  }

  /**
   * Generate stack name with proper naming convention
   */
  generateStackName(stackType: string, regionName: string, environment?: string): string {
    const naming = this.getStackNaming(environment);
    return `${naming.prefix}-${stackType}-${regionName}-${naming.suffix}`;
  }

  /**
   * Validate the entire configuration
   */
  private validateConfiguration(): void {
    this.validateEnvironments();
    this.validateCrossRegionSettings();
    
    // Validate each environment
    Object.keys(this.deploymentConfig.environments).forEach(env => {
      this.validateEnvironmentConfiguration(env);
    });
  }

  /**
   * Validate environment configurations exist
   */
  private validateEnvironments(): void {
    if (!this.deploymentConfig.environments || Object.keys(this.deploymentConfig.environments).length === 0) {
      throw new Error('No environment configurations found');
    }

    if (!this.deploymentConfig.environments[this.currentEnvironment]) {
      throw new Error(`Current environment '${this.currentEnvironment}' not found in configuration`);
    }
  }

  /**
   * Validate cross-region settings
   */
  private validateCrossRegionSettings(): void {
    const settings = this.deploymentConfig.crossRegionSettings;
    
    if (!settings.primaryRegion) {
      throw new Error('Primary region must be specified in cross-region settings');
    }

    if (!settings.paymentApiEndpoint) {
      throw new Error('Payment API endpoint must be specified in cross-region settings');
    }

    // Validate primary region exists in at least one environment
    const primaryRegionExists = Object.values(this.deploymentConfig.environments)
      .some(env => env.regions.some(r => r.regionName === settings.primaryRegion));
    
    if (!primaryRegionExists) {
      throw new Error(`Primary region '${settings.primaryRegion}' not found in any environment configuration`);
    }
  }

  /**
   * Validate configuration for a specific environment
   */
  private validateEnvironmentConfiguration(environment: string): void {
    const envConfig = this.deploymentConfig.environments[environment];
    
    // Validate regions exist
    if (!envConfig.regions || envConfig.regions.length === 0) {
      throw new Error(`No regions configured for environment: ${environment}`);
    }

    // Validate CIDR blocks don't overlap
    this.validateCidrBlocks(envConfig.regions);

    // Validate each region configuration
    envConfig.regions.forEach(region => {
      this.validateRegionConfiguration(region);
    });

    // Validate at least one region has payment deployment if primary region is in this environment
    const primaryRegion = this.deploymentConfig.crossRegionSettings.primaryRegion;
    const primaryRegionInEnv = envConfig.regions.find(r => r.regionName === primaryRegion);
    
    if (primaryRegionInEnv && !primaryRegionInEnv.deployPayment) {
      throw new Error(`Primary region '${primaryRegion}' must have payment deployment enabled`);
    }
  }

  /**
   * Validate CIDR blocks don't overlap within an environment
   */
  private validateCidrBlocks(regions: RegionConfig[]): void {
    const cidrBlocks = regions.map(r => r.cidrBlock);
    const uniqueCidrBlocks = new Set(cidrBlocks);
    
    if (cidrBlocks.length !== uniqueCidrBlocks.size) {
      throw new Error('Overlapping CIDR blocks detected in region configuration');
    }

    // Validate CIDR format
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    cidrBlocks.forEach(cidr => {
      if (!cidrRegex.test(cidr)) {
        throw new Error(`Invalid CIDR block format: ${cidr}`);
      }
    });
  }

  /**
   * Validate individual region configuration
   */
  private validateRegionConfiguration(region: RegionConfig): void {
    // Validate region name format
    const regionRegex = /^[a-z]{2}-[a-z]+-\d+$/;
    if (!regionRegex.test(region.regionName)) {
      throw new Error(`Invalid region name format: ${region.regionName}`);
    }

    // Validate availability zones
    if (!region.availabilityZones || region.availabilityZones.length < 2) {
      throw new Error(`Region ${region.regionName} must have at least 2 availability zones`);
    }

    // Validate AZ format
    region.availabilityZones.forEach(az => {
      if (!az.startsWith(region.regionName)) {
        throw new Error(`Availability zone ${az} does not match region ${region.regionName}`);
      }
    });

    // Validate instance types
    this.validateInstanceTypes(region.instanceTypes, region.regionName);

    // Validate database configurations
    this.validateDatabaseConfig(region.databaseConfig.iot, 'IoT', region.regionName);
    this.validateDatabaseConfig(region.databaseConfig.payment, 'Payment', region.regionName);
  }

  /**
   * Validate instance type configurations
   */
  private validateInstanceTypes(instanceTypes: { iot: string; payment: string }, regionName: string): void {
    const validInstanceTypePattern = /^[a-z]\d+[a-z]*\.[a-z0-9]+$/;
    
    if (!validInstanceTypePattern.test(instanceTypes.iot)) {
      throw new Error(`Invalid IoT instance type format in region ${regionName}: ${instanceTypes.iot}`);
    }

    if (!validInstanceTypePattern.test(instanceTypes.payment)) {
      throw new Error(`Invalid Payment instance type format in region ${regionName}: ${instanceTypes.payment}`);
    }
  }

  /**
   * Validate database configuration
   */
  private validateDatabaseConfig(dbConfig: DatabaseConfig, type: string, regionName: string): void {
    // Validate instance class
    const validDbInstancePattern = /^db\.[a-z]\d+\.[a-z0-9]+$/;
    if (!validDbInstancePattern.test(dbConfig.instanceClass)) {
      throw new Error(`Invalid ${type} database instance class in region ${regionName}: ${dbConfig.instanceClass}`);
    }

    // Validate allocated storage
    if (dbConfig.allocatedStorage < 20 || dbConfig.allocatedStorage > 65536) {
      throw new Error(`${type} database allocated storage must be between 20 and 65536 GB in region ${regionName}`);
    }

    // Validate backup retention period
    if (dbConfig.backupRetentionPeriod < 0 || dbConfig.backupRetentionPeriod > 35) {
      throw new Error(`${type} database backup retention period must be between 0 and 35 days in region ${regionName}`);
    }

    // Validate engine version format if provided
    if (dbConfig.engineVersion && !/^\d+\.\d+(\.\d+)?$/.test(dbConfig.engineVersion)) {
      throw new Error(`Invalid ${type} database engine version format in region ${regionName}: ${dbConfig.engineVersion}`);
    }
  }
}

/**
 * Configuration loader utility functions
 */
export class ConfigurationLoader {
  /**
   * Load configuration from environment variables
   */
  static loadFromEnvironment(): DeploymentConfig {
    const environment = process.env.CDK_ENVIRONMENT || 'development';
    const configManager = new ConfigurationManager(environment);
    return configManager.getDeploymentConfig();
  }

  /**
   * Load configuration from JSON file
   */
  static loadFromFile(filePath: string): DeploymentConfig {
    try {
      const fs = require('fs');
      const configData = fs.readFileSync(filePath, 'utf8');
      const config = JSON.parse(configData) as DeploymentConfig;
      
      // Validate loaded configuration
      const manager = new ConfigurationManager('development', config);
      return config;
    } catch (error) {
      throw new Error(`Failed to load configuration from file ${filePath}: ${error}`);
    }
  }

  /**
   * Merge configurations with override precedence
   */
  static mergeConfigurations(baseConfig: DeploymentConfig, overrideConfig: Partial<DeploymentConfig>): DeploymentConfig {
    const merged: DeploymentConfig = {
      environments: { ...baseConfig.environments },
      crossRegionSettings: { ...baseConfig.crossRegionSettings }
    };

    // Merge cross-region settings
    if (overrideConfig.crossRegionSettings) {
      merged.crossRegionSettings = {
        ...merged.crossRegionSettings,
        ...overrideConfig.crossRegionSettings
      };
    }

    // Merge environment configurations
    if (overrideConfig.environments) {
      Object.keys(overrideConfig.environments).forEach(env => {
        if (overrideConfig.environments![env]) {
          merged.environments[env] = {
            ...merged.environments[env],
            ...overrideConfig.environments![env]
          };
        }
      });
    }

    // Validate merged configuration
    const manager = new ConfigurationManager('development', merged);
    return merged;
  }
}

/**
 * Configuration validation utilities
 */
export class ConfigurationValidator {
  /**
   * Validate CIDR block format and range
   */
  static validateCidrBlock(cidr: string): boolean {
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/;
    if (!cidrRegex.test(cidr)) {
      return false;
    }

    const [ip, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    
    // Validate prefix length
    if (prefix < 8 || prefix > 28) {
      return false;
    }

    // Validate IP octets
    const octets = ip.split('.').map(Number);
    return octets.every(octet => octet >= 0 && octet <= 255);
  }

  /**
   * Check if two CIDR blocks overlap
   */
  static cidrBlocksOverlap(cidr1: string, cidr2: string): boolean {
    if (cidr1 === cidr2) {
      return true;
    }

    // Simple overlap check - in production, you'd use a proper IP library
    const [ip1, prefix1] = cidr1.split('/');
    const [ip2, prefix2] = cidr2.split('/');
    
    // For this demo, we'll do a basic string comparison
    // In production, use proper IP address libraries like 'ip' or 'netmask'
    const network1 = ip1.split('.').slice(0, 2).join('.');
    const network2 = ip2.split('.').slice(0, 2).join('.');
    
    return network1 === network2;
  }

  /**
   * Validate AWS region name format
   */
  static validateRegionName(regionName: string): boolean {
    const regionRegex = /^[a-z]{2}-[a-z]+-\d+$/;
    return regionRegex.test(regionName);
  }

  /**
   * Validate availability zone format
   */
  static validateAvailabilityZone(az: string, regionName: string): boolean {
    return az.startsWith(regionName) && /^[a-z]{2}-[a-z]+-\d+[a-z]$/.test(az);
  }

  /**
   * Validate EC2 instance type format
   */
  static validateInstanceType(instanceType: string): boolean {
    const instanceTypeRegex = /^[a-z]\d+[a-z]*\.[a-z0-9]+$/;
    return instanceTypeRegex.test(instanceType);
  }

  /**
   * Validate RDS instance class format
   */
  static validateRdsInstanceClass(instanceClass: string): boolean {
    const rdsInstanceRegex = /^db\.[a-z]\d+\.[a-z0-9]+$/;
    return rdsInstanceRegex.test(instanceClass);
  }
}