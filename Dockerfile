# Use Playwright's official Docker image with all dependencies pre-installed
FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Create screenshots directory for debug mode
RUN mkdir -p screenshots

# Expose the port your Express app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
