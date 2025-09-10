# AWS Multi-Region CDK Demo

This directory contains the AWS CDK infrastructure code for the multi-region demo application.

## Project Structure

```
cdk/
├── config/           # Configuration management
│   ├── types.ts      # TypeScript interfaces and types
│   ├── regions.ts    # Region-specific configurations
│   ├── config-manager.ts  # Configuration management logic
│   └── index.ts      # Configuration exports
├── stacks/           # CDK stack implementations
│   ├── network-stack.ts   # VPC and networking infrastructure
│   └── index.ts      # Stack exports
├── test/             # Unit tests
│   ├── config-manager.test.ts  # Configuration tests
│   └── network-stack.test.ts   # Network stack tests
├── main.ts           # CDK app entry point
├── package.json      # Node.js dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── cdk.json          # CDK configuration
└── jest.config.js    # Jest test configuration
```

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm test` - Run unit tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run cdk` - Run CDK CLI commands
- `npm run deploy` - Build and deploy all stacks
- `npm run destroy` - Destroy all stacks

## CDK Commands

- `cdk synth` - Synthesize CloudFormation templates
- `cdk deploy` - Deploy stacks to AWS
- `cdk destroy` - Remove stacks from AWS
- `cdk diff` - Show differences between deployed and local stacks

## Environment Configuration

The project supports multiple environments (development, production) with different region configurations. Set the environment using:

```bash
cdk deploy --context environment=production
```

## Security

The project uses CDK Nag for security validation. Security checks are automatically applied during synthesis.