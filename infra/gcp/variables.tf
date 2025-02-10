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

variable "application" {
  description = "Application Name"
  type        = string
  default     = "authtest"
}

variable "project_number" {
  description = "Google cloud project number of project"
  type        = string
}
