# Contributing to Gaggimate Profile Store

## Quick Start

1. Fork this repository
2. Create your profile folder in `profiles/{your-profile}/`
3. Add `index.json` with your profile metadata
4. Add your profile JSON file(s)
5. Submit a Pull Request

## Profile Structure

```
profiles/
└── {profile-name}/
    ├── index.json          # Required - profile catalog
    ├── {profile}.json    # Your profile data
    └── images/          # Optional images
```

## Required Fields

```json
{
  "name": "your-profile-id",
  "downloadPath": "/profiles/your-profile-id/"
}
```

## Recommended Fields

```json
{
  "displayName": "Your Profile Name",
  "description": "What your profile does...",
  "author": "YourName",
  "link": "https://discord.com/...",
  "difficulty": "beginner"
}
```

## Profile JSON Format

See the [Documentation](./documentation/) for full schema.

## Validation

Run locally before submitting:

```bash
npm install
npm run lint
npm run validate
```

## Questions?

Join the [Discord](https://discord.gg/gaggimate)