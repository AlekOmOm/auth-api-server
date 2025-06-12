# Core Components Documentation

## API Documentation

The OpenAPI specification for the Auth System has been consolidated to a single source of truth.

Please refer to: `/docs/core-components/OpenAPI-Specs.yaml`

This ensures consistency across all components and prevents documentation drift.

## Model Layer Architecture

For comprehensive documentation on the Model Layer, dependency management, and architectural patterns:

- **[Model Layer Architecture](./model-layer-architecture.md)** - Complete architectural overview, dependency management strategies, and best practices
- **[Dependency Troubleshooting Guide](./dependency-troubleshooting-guide.md)** - Quick reference for resolving circular dependency issues

### Quick References

**For Circular Dependency Issues:**
- See error patterns in [Dependency Troubleshooting Guide](./dependency-troubleshooting-guide.md#quick-diagnosis-checklist)
- Follow the step-by-step resolution process
- Use the emergency fixes if needed

**For Model Development:**
- Review import guidelines in [Model Layer Architecture](./model-layer-architecture.md#import-strategy-guidelines)
- Follow the architectural principles and best practices
- Check the testing strategy for proper model testing 