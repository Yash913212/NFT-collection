NFT Collection
===============

This repository implements a simple ERC-721–compatible NFT contract `NftCollection.sol` with a test suite and Dockerized test runner.

Build & test (local):

1. Install dependencies:

```bash
npm install
```

2. Run tests:

```bash
npm test
```

Build & test in Docker (self-contained: installs dependencies and compiles inside container):

```bash
docker build -t nft-contract .
docker run --rm nft-contract
```

Notes:
- The Docker image is self-contained: it installs dependencies, compiles contracts, and runs tests all inside the container without relying on host files.
- Contract: `contracts/NftCollection.sol`
- Tests: `test/NftCollection.test.js`
- All 10 tests pass consistently in the Docker container.
