variable "project_id" {
  description = "Google Cloud Project ID of the File Upload Project"
  type        = string
}

variable "region" {
  description = "Google Cloud Project ID of the File Upload Project"
  type        = string
  default     = "europe-west2"
}

variable "expiration_minutes" {
  default     = 15
  description = "The expiration time in minutes for the signed URL."
}