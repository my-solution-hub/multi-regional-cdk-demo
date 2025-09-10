# AWS Multi-Region CDK Demo

This project demonstrates how to leverage AWS CDK (Cloud Development Kit) as Infrastructure as Code (IaC) to accelerate new deployments across multiple regions for business expansion.

## Architecture Overview

The demo showcases a multi-region architecture with two applications:

- **IoT Application**: Expands globally across multiple regions (Virginia, Frankfurt, Sydney)
- **Payment Application**: Centralized in the US but accessible from all regions via Transit Gateway

### Current Implementation Status

✅ **Network Infrastructure** - VPC, subnets, security groups, Transit Gateway  
🚧 **IoT Stack** - Coming next  
🚧 **Payment Stack** - Coming next  
🚧 **Demo Stack** - Coming next

## Project Structure

```
├── .kiro/                  # Kiro IDE specifications and tasks
│   └── specs/             # Feature specifications and implementation plans
├── app/                    # Demo Java applications
│   ├── hello/             # Hello Java Spring Boot application
│   └── world/             # World Java Spring Boot application
├── cdk/                    # CDK infrastructure code
│   ├── config/            # Configuration management
│   │   ├── types.ts       # TypeScript interfaces and types
│   │   ├── regions.ts     # Region-specific configurations
│   │   ├── config-manager.ts  # Configuration management logic
│   │   └── index.ts       # Configuration exports
│   ├── stacks/            # CDK stack implementations
│   │   ├── network-stack.ts   # ✅ VPC and networking infrastructure
│   │   └── index.ts       # Stack exports
│   ├── test/              # Unit tests (71 tests passing)
│   │   ├── config-manager.test.ts
│   │   └── network-stack.test.ts
│   ├── main.ts            # CDK app entry point
│   ├── package.json       # Dependencies and scripts
│   └── README.md          # CDK-specific documentation
└── scripts/               # Deployment and utility scripts
```

## Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)

## Getting Started

### Quick Start

1. **Navigate to CDK directory:**
   ```bash
   cd cdk
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

5. **Bootstrap CDK (first time only):**
   ```bash
   # Bootstrap all regions you plan to deploy to
   cdk bootstrap aws://ACCOUNT-NUMBER/us-east-1
   cdk bootstrap aws://ACCOUNT-NUMBER/eu-central-1
   cdk bootstrap aws://ACCOUNT-NUMBER/ap-southeast-2
   ```

6. **Deploy stacks (see deployment options below)**

## Deployment Configuration

> ⚠️ **CRITICAL**: The `--context environment=` parameter determines which infrastructure gets created. Development and production are completely separate setups that can coexist in the same AWS account with different stack names.

### Environment Selection

The `--context environment=` parameter creates **completely different infrastructure setups**:

## 🔧 Development Environment (`--context environment=development`)
- **Regions**: us-east-1 ONLY
- **Stack Names**: `MultiRegionDemo-*-us-east-1-Dev`
- **Cost Optimization**: Spot instances enabled, minimal monitoring
- **Purpose**: Testing, development, cost-effective single-region setup

## 🏭 Production Environment (`--context environment=production`)  
- **Regions**: us-east-1 + eu-central-1 + ap-southeast-2
- **Stack Names**: `MultiRegionDemo-*-{region}-Prod`
- **Cost Optimization**: On-demand instances, detailed monitoring
- **Purpose**: Multi-region production deployment

| Setting | Development | Production |
|---------|-------------|------------|
| **Regions** | us-east-1 only | us-east-1, eu-central-1, ap-southeast-2 |
| **Stack Suffix** | `-Dev` | `-Prod` |
| **Instance Types** | Spot instances | On-demand instances |
| **Monitoring** | Basic | Detailed |
| **Multi-AZ** | Yes | Yes |
| **Backup Retention** | 7 days (IoT), 30 days (Payment) | 7 days (IoT), 30 days (Payment) |

### Setting the Environment

⚠️ **IMPORTANT**: The environment parameter creates completely separate infrastructure!

```bash
# Creates stacks named: MultiRegionDemo-Network-us-east-1-Dev
cdk deploy --context environment=development --all

# Creates stacks named: MultiRegionDemo-Network-us-east-1-Prod, MultiRegionDemo-Network-eu-central-1-Prod, etc.
cdk deploy --context environment=production --all
```

**Default**: If no environment is specified, `development` is used.

**Key Point**: Development and production environments are completely isolated - they create different stack names and can coexist in the same AWS account.

### Deployment Options

#### Option 1: Deploy Development Environment (Single Region)
```bash
cd cdk
cdk deploy --context environment=development --all
```
**Creates these stacks**:
- `MultiRegionDemo-Network-us-east-1-Dev`
- `MultiRegionDemo-IoT-us-east-1-Dev` (when implemented)
- `MultiRegionDemo-Payment-us-east-1-Dev` (when implemented)
- `MultiRegionDemo-Demo-us-east-1-Dev` (when implemented)

**Infrastructure**: us-east-1 only, spot instances, basic monitoring

#### Option 2: Deploy Production Environment (Multi-Region)
```bash
cd cdk
cdk deploy --context environment=production --all
```
**Creates these stacks**:
- `MultiRegionDemo-Network-us-east-1-Prod` + Transit Gateway
- `MultiRegionDemo-Network-eu-central-1-Prod`
- `MultiRegionDemo-Network-ap-southeast-2-Prod`
- `MultiRegionDemo-IoT-us-east-1-Prod` (when implemented)
- `MultiRegionDemo-IoT-eu-central-1-Prod` (when implemented)
- `MultiRegionDemo-IoT-ap-southeast-2-Prod` (when implemented)
- `MultiRegionDemo-Payment-us-east-1-Prod` (when implemented)
- `MultiRegionDemo-Demo-us-east-1-Prod` (when implemented)

**Infrastructure**: 3 regions, on-demand instances, detailed monitoring

#### Option 3: Deploy Specific Stacks
```bash
cd cdk

# Deploy only Network stacks to all regions in production
cdk deploy --context environment=production "MultiRegionDemo-Network-*-Prod"

# Deploy only to specific region
cdk deploy --context environment=production "MultiRegionDemo-Network-us-east-1-Prod"

# Deploy IoT stacks only
cdk deploy --context environment=production "MultiRegionDemo-IoT-*-Prod"
```

#### Option 4: Deploy to Custom Regions
To deploy to different regions, modify `cdk/config/regions.ts`:

1. Edit the environment configuration:
   ```typescript
   development: {
     regions: [
       DEFAULT_REGIONS['us-east-1'],
       DEFAULT_REGIONS['eu-central-1']  // Add more regions
     ],
     // ... rest of config
   }
   ```

2. Deploy:
   ```bash
   cdk deploy --context environment=development --all
   ```

### Stack Naming Convention

Stacks are named using the pattern: `{Prefix}-{StackType}-{Region}-{Suffix}`

Examples:
- `MultiRegionDemo-Network-us-east-1-Dev`
- `MultiRegionDemo-IoT-eu-central-1-Prod`
- `MultiRegionDemo-Payment-us-east-1-Prod`

### Application Deployment Matrix

| Stack Type | us-east-1 | eu-central-1 | ap-southeast-2 |
|------------|-----------|--------------|----------------|
| **Network** | ✅ Always | ✅ Always | ✅ Always |
| **IoT** | ✅ Always | ✅ Always | ✅ Always |
| **Payment** | ✅ Always | ❌ Never | ❌ Never |
| **Demo** | ✅ Always | ❌ Never | ❌ Never |
| **Transit Gateway** | ✅ Primary region only | ❌ | ❌ |

### Region-Specific Configuration

Each region has predefined settings in `cdk/config/regions.ts`:

| Region | CIDR Block | Availability Zones | Applications |
|--------|------------|-------------------|--------------|
| **us-east-1** | 10.1.0.0/16 | us-east-1a, us-east-1b | IoT + Payment + Demo |
| **eu-central-1** | 10.3.0.0/16 | eu-central-1a, eu-central-1b | IoT only |
| **ap-southeast-2** | 10.4.0.0/16 | ap-southeast-2a, ap-southeast-2b | IoT only |

## Available Scripts

### NPM Scripts (from `cdk/` directory)

- `npm run build` - Compile TypeScript
- `npm run watch` - Watch for changes and compile
- `npm test` - Run unit tests (71 tests)
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run deploy` - Build and deploy all stacks to development environment
- `npm run destroy` - Destroy all stacks from development environment
- `npm run synth` - Synthesize CloudFormation templates
- `npm run diff` - Show differences between deployed and local stacks

### CDK CLI Commands (from `cdk/` directory)

```bash
# Synthesis (generate CloudFormation templates)
cdk synth --context environment=development
cdk synth --context environment=production

# Deployment
cdk deploy --context environment=development --all
cdk deploy --context environment=production --all
cdk deploy --context environment=production "MultiRegionDemo-Network-us-east-1-Prod"

# Destruction
cdk destroy --context environment=development --all
cdk destroy --context environment=production --all

# Diff (show changes)
cdk diff --context environment=production --all

# List stacks
cdk list --context environment=production
```

### Deployment Scripts (from root directory)

- `./scripts/deploy.sh` - Deploy using deployment script
- `./scripts/destroy.sh` - Destroy using destruction script

### Useful CDK Commands

```bash
# Check what will be deployed
cdk list --context environment=production

# See the CloudFormation template
cdk synth --context environment=production MultiRegionDemo-Network-us-east-1-Prod

# Deploy with approval prompts
cdk deploy --context environment=production --require-approval=any-change

# Deploy without approval prompts (CI/CD)
cdk deploy --context environment=production --require-approval=never --all
```

## Configuration

### Region Configuration

Region and deployment configurations are defined in the `cdk/config/` directory:

- `types.ts` - TypeScript interfaces and types for all configurations
- `regions.ts` - Region-specific configurations (US East, EU Central, AP Southeast)
- `config-manager.ts` - Centralized configuration management with validation
- `index.ts` - Configuration exports

### Supported Regions

- **us-east-1** (Primary): IoT + Payment + Demo + Transit Gateway
- **eu-central-1**: IoT only
- **ap-southeast-2**: IoT only

### Network Configuration

Each region gets:

- VPC with /16 CIDR block (10.1.0.0/16, 10.3.0.0/16, 10.4.0.0/16)
- 4 subnets: 2 public + 2 private with /24 masks
- Security groups for web, app, and database tiers
- NAT Gateways for high availability
- Transit Gateway (US region only) for cross-region connectivity

## Applications

The `app/` directory contains demo Java applications:

- `hello/` - Simple "Hello" Java Spring Boot application
- `world/` - Simple "World" Java Spring Boot application

## Security & Best Practices

- **CDK Nag**: Automatic security validation against AWS best practices
- **Least Privilege**: Security groups follow principle of least privilege
- **Network Segmentation**: Separate tiers (web, app, database) with appropriate access controls
- **High Availability**: Multi-AZ deployment with redundant NAT Gateways
- **Encryption**: Database encryption at rest enabled by default
- **Comprehensive Testing**: 71 unit tests covering all infrastructure components

## Implementation Progress

### ✅ Completed: Network Infrastructure (Task 3)

- **NetworkStack**: VPC, subnets, security groups, Transit Gateway
- **Configuration Management**: Multi-environment support with validation
- **Unit Tests**: Comprehensive test coverage (32 tests for NetworkStack)
- **Security**: CDK Nag integration with justified suppressions
- **Documentation**: Complete API documentation and examples

### 🚧 Coming Next

- **IoT Stack**: EC2 instances, Auto Scaling, Application Load Balancer, RDS MySQL
- **Payment Stack**: ECS Fargate, Network Load Balancer, RDS MySQL, ElastiCache
- **Demo Stack**: Java application deployment with cross-region payment integration

### 📋 Development Workflow

This project follows a spec-driven development approach:

1. **Requirements**: Define user stories and acceptance criteria
2. **Design**: Create detailed technical design documents
3. **Tasks**: Break down implementation into actionable coding tasks
4. **Implementation**: Execute tasks with comprehensive testing

See `.kiro/specs/aws-multi-region-cdk-demo/` for detailed specifications.

## Quick Reference: Common Deployment Scenarios

### Scenario 1: First-time Development Setup
```bash
cd cdk
npm install
npm run build
npm test
cdk bootstrap aws://123456789012/us-east-1
cdk deploy --context environment=development --all
```

### Scenario 2: Production Multi-Region Deployment
```bash
cd cdk
# Bootstrap all regions first
cdk bootstrap aws://123456789012/us-east-1
cdk bootstrap aws://123456789012/eu-central-1
cdk bootstrap aws://123456789012/ap-southeast-2

# Deploy all stacks to all regions
cdk deploy --context environment=production --all
```

### Scenario 3: Deploy Only Network Infrastructure
```bash
cd cdk
# Development (single region)
cdk deploy --context environment=development "MultiRegionDemo-Network-us-east-1-Dev"

# Production (all regions)
cdk deploy --context environment=production "MultiRegionDemo-Network-*-Prod"
```

### Scenario 4: Deploy to Custom Region Set
1. Edit `cdk/config/regions.ts` to modify environment regions
2. Deploy:
   ```bash
   cd cdk
   cdk deploy --context environment=development --all
   ```

### Scenario 5: Check What Will Be Deployed
```bash
cd cdk
# List all stacks for environment
cdk list --context environment=production

# See changes before deployment
cdk diff --context environment=production --all

# Generate CloudFormation templates
cdk synth --context environment=production
```

## Troubleshooting

### Common Issues

- **CDK Bootstrap**: Ensure CDK is bootstrapped in all target regions
- **AWS Credentials**: Verify AWS CLI is configured with appropriate permissions
- **Node Version**: Use Node.js 18+ for compatibility
- **Region Limits**: Check AWS service limits in target regions

### Getting Help

- Check the CDK-specific README: `cdk/README.md`
- Review test files for usage examples: `cdk/test/`
- Examine configuration examples: `cdk/config/`

## License

MIT
