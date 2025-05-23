# BFF Handler S3

<div align="center">
  <img src="./images/bff-handler-s3-logo.png" alt="BFF Handler S3 Logo" width="300"/>
</div>

## 📦 Overview

**BFF Handler S3** is a backend-for-frontend (BFF) application designed to handle large CSV file uploads to an S3-compatible storage. It includes advanced features such as:

- **Dynamic Rate Limiting**: Prevents overloading the system by limiting the number of requests.
- **Circuit Breaking**: Ensures system stability by halting operations when failures exceed a threshold.
- **Retry Logic**: Automatically retries failed operations to improve reliability.
- **Health Checks**: Monitors the application's health and ensures uptime.

---

## 🚀 CI/CD Pipeline

When a **pull request** is created or merged into the `main` branch, the following pipeline is triggered:

1. **Run Tests**: Executes all unit and integration tests to ensure the application is functioning as expected.
2. **Deploy Infrastructure**: Uses Terraform to deploy the infrastructure to the cloud.
3. **Deploy Application**: Builds and deploys the NestJS application to the target environment.
4. **Create a Backend Bucket**: Create before a backend bucket for the tf state called backend-tf-${YOUR-AWS-ACCOUNT-ID}

### **Required GitHub Secrets**

To run the pipeline in GitHub Actions, the following secrets must be configured:

- **`AWS_ACCESS_KEY_ID`**: AWS access key for deploying infrastructure and accessing S3.
- **`AWS_SECRET_ACCESS_KEY`**: AWS secret key for deploying infrastructure and accessing S3. P.S.: I Could use OPEN-ID, but for demonstration should be enough.
- **`APP_USER`**: Username for Basic Authentication in the application.
- **`APP_PASSWORD`**: Password for Basic Authentication in the application.

---

## 📂 Project Structure

### **Folders**

- **`app/`**: Contains the NestJS application.
  - To run the application locally:
    ```bash
    npm run start:dev
    ```
- **`terraform/`**: Contains all infrastructure code managed by Terraform.

  - To configure the infrastructure:
    1. Rename `terraform.tfvars.example` to `terraform.tfvars`.
    2. Run the following commands:
       ```bash
       terraform init
       terraform apply
       ```

- **`insomnia/`**: Contains example requests for testing the API. You can import these requests into [Insomnia](https://insomnia.rest/).

---

## 🛠️ Local Development

For the next version, the application will include support for **LocalStack** in the development environment. When running in `DEV` mode, the application will:

1. Use LocalStack to simulate S3 storage.
2. Automatically create two buckets for testing purposes.

---

## 📡 API Endpoints

This section explains the available API endpoints and their functionality:

### **1. `/health`**

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

### **2. `/health/check`**

- **Purpose**: Used for **Application Load Balancer (ALB)** health checks.
- **Authentication**: **No authentication required**.
- **Response**: Returns a simple status indicating the server is running, for ALB health check.
- **Example**:
  ```json
  true
  ```

---

### **3. `/files/upload`**

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

  - **Production/CI/CD**: The username and password must be stored as **GitHub Actions Secrets**.
  - **Local/Development**: Use a `.env` file to define the credentials. Refer to the `.env.example` file for the required format.

  Example `.env` file:

  ```env
  APP_USER=your-username
  APP_PASSWORD=your-password
  ```

---

## 📸 Screenshots

### Project Architecture

<div align="center">
  <img src="./images/bff-file-handler-s3.drawio.png" alt="Project Architecture" width="600"/>
</div>

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

### Health Check Endpoint

<div align="center">
  <img src="./images/health-check.png" alt="Health Check" width="600"/>
</div>

<p> Check the Task for ALB communicate

---

## 🧪 Testing

To ensure the application is functioning correctly, the pipeline runs all unit and integration tests. You can also run tests locally:

```bash
npm run test
```

---

## 📖 API Documentation

The API endpoints are documented in the `insomnia/` folder. Import the provided file into [Insomnia](https://insomnia.rest/) to test the endpoints.

---

## 🌟 Features

- **Dynamic Rate Limiting**: Prevents abuse by limiting the number of requests per user.
- **Multipart Uploads**: Handles large file uploads by splitting them into smaller parts.
- **Retry Logic**: Automatically retries failed uploads.
- **Health Checks**: Ensures the application is running smoothly.

---

## 💣 To Destroy

To destroy the whole infrastructure in AWS, use the destroy.yaml inside of terraform folder change the value of the key destroy to true and push the modification.

---

## 🛠️ Future Enhancements

- **LocalStack Integration**: Automatically configure and use LocalStack for local development.
- **Bucket Management**: Create and manage buckets dynamically in the development environment.

---
