# Use official Node LTS image
FROM node:18-alpine

# Create working directory
WORKDIR /app

# Copy package files and install dependencies first (for build cache)
COPY package*.json ./

RUN npm install

# Copy entire project
COPY . .

# Compile contracts
RUN npx hardhat compile

# Default command: run tests
CMD ["npx", "hardhat", "test"]
