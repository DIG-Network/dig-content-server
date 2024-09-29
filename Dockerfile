# Use an official Ubuntu base image
FROM ubuntu:20.04

# Set environment variables for non-interactive installs
ENV DEBIAN_FRONTEND=noninteractive

# Set the working directory inside the container
WORKDIR /app

# Install curl, build-essential, pkg-config, and other dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    libsecret-1-dev \
    pkg-config \
    dbus \
    libssl-dev \
    libffi-dev \
    python3-dev \
    python3-pip \
    python3-venv \
    lsb-release \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*


# Generate the machine-id
RUN dbus-uuidgen > /etc/machine-id

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Install Chia Dev Tools from PyPI globally so 'run' and 'brun' are available system-wide
RUN python3 -m pip install --upgrade pip && \
    python3 -m pip install --extra-index-url https://pypi.chia.net/simple/ chia-dev-tools

# Copy the current directory contents into the container at /app
COPY . .

# Install any needed packages specified in package.json
RUN npm install
RUN npm i datalayer-driver-linux-x64-gnu
RUN npm run build

# Rebuild any native modules for the current environment
RUN npm rebuild

# Expose the port the app runs on
EXPOSE 4161

# Run npm start command when the container launches
CMD ["node", "dist/cluster.js"]
