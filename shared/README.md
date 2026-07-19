# Shared Types — OpenAPI Codegen

This directory holds the **single source of truth** for types shared between frontend and backend.

## Workflow

1. Edit `openapi/spec.yaml`
2. Generate types for each target:

### Frontend (TypeScript)

```bash
npx openapi-typescript openapi/spec.yaml -o ../frontend/src/types/api.generated.ts
```

### Backend (Python / Pydantic)

```bash
pip install datamodel-code-generator
datamodel-codegen \
  --input openapi/spec.yaml \
  --input-file-type openapi \
  --output ../backend/app/models/schemas_generated.py \
  --output-model-type pydantic_v2
```

## Rules

- **Never** hand-write shared types in both repos — always generate from `spec.yaml`.
- Manually-authored models in `backend/app/models/schemas.py` can **extend** generated models but should not duplicate them.
- Re-run codegen after every spec change and commit the generated files.
