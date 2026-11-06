FROM node:20-bullseye

WORKDIR /app

# Install dependencies separately for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

# Expo CLI/Metro should not ask interactive questions inside the container
ENV EXPO_NO_INTERACTIVE=1 \
    EXPO_NO_TELEMETRY=1 \
    EXPO_USE_DEV_SERVER=1 \
    CI=1 \
    EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

# Default Expo/Metro ports
EXPOSE 8081 8082 19000 19001

# Run Expo dev server (Metro) in CI mode without interactive prompts
# Use LAN to avoid ngrok/tunnel prompts in CI/non-interactive environments
CMD ["npm", "start", "--", "--host", "lan"]
