resource "aws_s3_bucket" "main" {
  bucket   = local.bucket_main

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket" "fallback" {
  bucket   = local.bucket_fallback

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "versioning_main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "versioning_fallback" {
  bucket = aws_s3_bucket.fallback.id
  versioning_configuration {
    status = "Enabled"
  }
}


resource "aws_iam_role" "replication" {
  name = "s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect    = "Allow",
        Principal = {
          Service = "s3.amazonaws.com"
        },
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "replication_policy" {
  name = "s3-replication-policy"
  role = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ],
        Resource = aws_s3_bucket.main.arn
      },
      {
        Effect   = "Allow",
        Action   = [
          "s3:GetObjectVersion",
          "s3:GetObjectVersionAcl"
        ],
        Resource = "${aws_s3_bucket.main.arn}/*"
      },
      {
        Effect   = "Allow",
        Action   = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ],
        Resource = "${aws_s3_bucket.fallback.arn}/*"
      }
    ]
  })
}

resource "aws_s3_bucket_replication_configuration" "replication" {
  bucket   = aws_s3_bucket.main.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "main-to-fallback"
    status = "Enabled"

    delete_marker_replication {
      status = "Disabled"
    }

    destination {
      bucket        = aws_s3_bucket.fallback.arn
      storage_class = "STANDARD"
    }

    filter {
      prefix = ""
    }
  }
}