# BFF Handler S3

<div align="center">
  <img src="../images/bff-handler-s3-logo.png" alt="BFF Handler S3 Logo" width="300"/>
</div>

## 📦 Overview

**BFF Handler S3** is a backend-for-frontend (BFF) application designed to handle large CSV file uploads to an S3-compatible storage. It includes advanced features such as:

- **Dynamic Rate Limiting**: Prevents overloading the system by limiting the number of requests.
- **Circuit Breaking**: Ensures system stability by halting operations when failures exceed a threshold.
- **Retry Logic**: Automatically retries failed operations to improve reliability.
- **Health Checks**: Monitors the application's health and ensures uptime.

---

## 🛠️ Local Development

### **Setup**

To run the application locally, follow these steps:

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the `app/` folder based on the `.env.example` file:

   ```env
   APP_USER=your-username
   APP_PASSWORD=your-password
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=your-aws-region
   BUCKET_NAME=your-bucket-name
   FALLBACK_BUCKET_NAME=your-fallback-bucket-name
   ```

4. Start the application in development mode:
   ```bash
   npm run start:dev
   ```

---

### **Project Structure**

- **`app/`**: Contains the NestJS application.
  - To run the application locally:
    ```bash
    npm run start:dev
    ```
- **`infra/`**: Contains all infrastructure code managed by Terraform.

  - To configure the infrastructure:
    1. Rename `terraform.tfvars.example` to `terraform.tfvars`.
    2. Run the following commands:
       ```bash
       terraform init
       terraform apply
       ```

- **`insomnia/`**: Contains example requests for testing the API. You can import these requests into [Insomnia](https://insomnia.rest/).

---

### **API Endpoints**

#### **1. `/health`**

- **Purpose**: Checks the health of the server and the S3 bucket service.
- **Authentication**: Requires **Basic Auth**.
- **Response**: Returns the status of the server and the bucket service.
- **Example**:
  ```json
  {
    "healthy": true,
    "healthyService": true,
    "bucketHealth": true,
    "cpuRatio": "0.27",
    "memUsage": "99.22%",
    "freeSpaceDisk": "20996.54 MB",
    "uptime": "6314s",
    "totalMem": "8192.00 MB",
    "freeMem": "93.14 MB"
  }
  ```

---

#### **2. `/health/check`**

- **Purpose**: Used for **Application Load Balancer (ALB)** health checks.
- **Authentication**: **No authentication required**.
- **Response**: Returns a simple status indicating the server is running.
- **Example**:
  ```json
  true
  ```

---

#### **3. `/files/upload`**

- **Purpose**: Uploads a file to the S3 bucket. If the file size exceeds **50 MB**, the application will perform an **asynchronous multipart upload**.
  If for some reason, the upload fails, it will try to upload to the fallback bucket. The upload will only fail if all buckets are unavailable.
- **Authentication**: Requires **Basic Auth**.
- **Request Body**:
  - The request must be a **multipart form-data** with a `file` field containing the file to upload.
- **Response**:
  - For small files (< 50 MB): Returns a success message with the file's upload status.
  - For large files (> 50 MB): Returns a success message indicating the multipart upload has started.
- **Example**:
  ```json
  {
    "success": true,
    "message": "Large file upload Async via multipart upload",
    "key": "1744303868658-Data8317.csv"
  }
  ```

---

### **Authentication Details**

- **Endpoints Requiring Basic Auth**:

  - `/health`
  - `/files/upload`

- **Username and Password**:

  - Use a `.env` file to define the credentials. Refer to the `.env.example` file for the required format.

  Example `.env` file:

  ```env
  APP_USER=your-username
  APP_PASSWORD=your-password
  ```

---

## 📸 Screenshots

### Successful Short File Upload

<div align="center">
  <img src="./images/short-image--response-ok.png" alt="Short File Upload Success" width="600"/>
</div>

### Successful Multipart Upload

<div align="center">
  <img src="./images/large-file-multipart.png" alt="Multipart Upload Success" width="600"/>
</div>

<p>The process will continue async.</p>

### Too Many Requests

<div align="center">
  <img src="./images/too-many-requests.png" alt="Too Many Requests" width="600"/>
</div>

### Multipart Upload Progression Logs

<div align="center">
  <img src="./images/progressive-multipart-log.png" alt="Multipart Upload Logs" width="600"/>
</div>

### Health Endpoint

<div align="center">
  <img src="./images/health.png" alt="Health" width="600"/>
</div>

<p> Check the Health of Server and the Buckets

---

## 🧪 Testing

To ensure the application is functioning correctly, you can run tests locally:

```bash
npm run test
```

---

## 🌟 Features

- **Dynamic Rate Limiting**: Prevents abuse by limiting the number of requests per user.
- **Multipart Uploads**: Handles large file uploads by splitting them into smaller parts.
- **Retry Logic**: Automatically retries failed uploads.
- **Health Checks**: Ensures the application is running smoothly.

---

## 🛠️ Future Enhancements

- **LocalStack Integration**: Automatically configure and use LocalStack for local development.
- **Bucket Management**: Create and manage buckets dynamically in the development environment.
