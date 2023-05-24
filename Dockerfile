# Menggunakan image Ubuntu 20.04 sebagai base image
FROM ubuntu:20.04

# Menentukan working directory di dalam container
WORKDIR /app

# Menyalin package.json dan package-lock.json ke dalam container
COPY package*.json ./

# Menginstall dependensi yang diperlukan
RUN apt-get update 
RUN apt-get install -y curl 
RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash - 
RUN apt-get install -y nodejs 
RUN npm install

# Menyalin seluruh kode proyek ke dalam container
COPY . .

# Menentukan port yang akan digunakan
EXPOSE 4000

# Menjalankan perintah untuk menjalankan API Node.js
CMD ["npm", "start"]
