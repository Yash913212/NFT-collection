FROM node:18-bullseye-slim

WORKDIR /app

# Install core build dependencies for compiling Solidity
RUN apt-get update && apt-get install -y python3 build-essential git curl ca-certificates && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy package descriptors and install dependencies inside the container
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Copy the rest of the repo and compile contracts, then run tests
COPY . .
RUN npx hardhat compile

CMD ["npx", "hardhat", "test"]
