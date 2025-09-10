#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { NetworkStack } from './stacks/network-stack';
import { ConfigurationManager } from './config/config-manager';

const app = new cdk.App();

// Apply CDK Nag security checks
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// Initialize configuration manager
const environment = app.node.tryGetContext('environment') || 'development';
const configManager = new ConfigurationManager(environment);

// Get regions for the current environment
const regions = configManager.getEnvironmentRegions();
const primaryRegion = configManager.getPrimaryRegion();

// Create NetworkStack for each region
regions.forEach(regionConfig => {
  const stackName = configManager.generateStackName('Network', regionConfig.regionName);
  
  new NetworkStack(app, stackName, {
    region: regionConfig.regionName,
    cidrBlock: regionConfig.cidrBlock,
    environment: environment,
    enableTransitGateway: configManager.shouldEnableTransitGateway(regionConfig.regionName),
    tags: configManager.getCommonTags(),
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: regionConfig.regionName,
    },
  });
});

// TODO: Add IoT, Payment, and Demo stacks in subsequent tasks