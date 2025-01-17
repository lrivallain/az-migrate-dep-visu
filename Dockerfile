# Use the official nginx image from the Docker Hub
FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy the static files into the container
COPY . /usr/share/nginx/html

# Expose the port nginx runs on
EXPOSE 80

# No CMD needed as nginx runs by default