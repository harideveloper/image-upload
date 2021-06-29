# image-upload


Assmuptions (Functional)

    * Regional scope and customer from only within UK accessing the application
    * Application to be available 24 * 7 ( Uptime 100% )
    * Resource Capacity / Capability - Moderate

Assumptions (Technical)

    * Application is stateless
    * Vendor dependent solution 
    * Moderate Portability efforts 
    * 3 Environments  Staging Testing Environment, Performance Testing Environment (pre-prod) and Production Environment
    * Production Environment 
      * 10000 Requests for Month (Roughly)
      * Average concurrent users 20 (Roughly)
    * NFT Environment (Same as prod)
      * 10000 Requests for Month (Roughly)
      * Average concurrent users 20 (Roughly)
    * Staging Environment 
      * 2500 Requests for Month (Roughly)
      * Average concurrent users 5 (Roughly)



Application Technical Stack

      Front End : React JS
      Backend : Node JS, Express JS 
      Database : MySQL
      Storage : Google Storage Buckets 
      Containerisation : Docker
      LoadTest Application : python/kubernetes
      
      
Application Design & GCP Design

    * Application is three tiered architecture with web requests served by react js frontend application. 
    * User authentication is verified by Google IAP Platform with Google Sign-in
    * Backend Node JS Microservice receiving image upload and view images requests
    * Google Storage Buckets to upload the Images
    * MySQL database to update the signed URLs , IAP User Token 
    * Terraform Project to create environment resources
    * CI/CD Triggers - Cloud Build
    * Application code hosted in GitHUB repository 
  
  
  GCP Design & Solution
  
	  * Front End : React JS —> Cloud Run
	  * Backend : Node JS, Express JS  —> Cloud Run
	  * Database : MySQL  —> Google SQL MySQL
	  * Storage —> Google Storage Buckets 
	  * LoadTest Application : —> GKE
	  * Logs & Monitoring —> Cloud Logging & Cloud Monitoring
    
 Design Considerations (Cloud Run & GKE)

    * Cost                                    ( Cloud Run >> GKE )
    * Administration Efforts	                ( Cloud Run >> GKE )
    * Deployment Deadline / Project Timeline 	( Cloud Run >> GKE )
    * Efforts to build                        ( Cloud Run >> GKE )
    * Resources Capability                    ( GKE >> Cloud Run )
    * Security 	                              ( GKE >> Cloud Run )
    * Portability/Migration/Vendor Dependent  ( GKE >> Cloud Run )
    * Test vs Prod                            ( GKE >> Cloud Run )

  
Application high level components

  Image UI  — ( React JS / Cloud Run )

        - Function components (react hooks)
        - React-router-dom
        - Runtime environment variables injection
        - package.json
        - Jest TDD
        - Coverage
            - reports
        - Docker
        - CloudBuild
  
  ImageUploadService — ( Node JS / Express JS / Cloud Run )
  
      - Express Routes 
          - /uploadImage
          - /getSignedURL
          - /viewImages
      - cors / helmet
      - controllers 
      - model
      - config
      - Coverage
          - coverage reports
      - Test 
          - Jest TDD
          - SuperTest - IDD
      - Docker
      - CloudBuild
      
   Image Storage Bucket — ( Cloud Storage )
   
    - Service Accounts
    - Terraform Project
    
   Image Database — ( Google SQL / MySQL)
   
    - Service Accounts
    - Cloud Storage
    - Terraform Project
    
   ImageResourceBuild ( Terraform )
   
    - Image-IAM-policy
        - services accounts for cloud run services, database, storage and Locust GKE
    - ImageUI
    - ImageUploadService
    - ImageDB
        - SQL Scripts (DB creation)
    - Storage Buckets
        - Image Storage 
            - Service Accounts
            - Image Bucket
        - Log storage
            - Service Accounts
            - Log Bucket
        - CI/CD storage 
            - Service Accounts
            - CI/CD Bucket
    - LocustCluster
        - VPC
        - GKE
        - Storage Bucket  (Test Data)
    - Global Load Balancer
    - Cloud Build/ Trigger
    - Cloud DNS Policies
    
  Choosing database ( SQL/NoSQL )

    - Structured ? - gMYSQL
    - Data Requirement Clarity - gMYSQL
    - Developer Capability/Learning - gMYSQL
    - ACID - gMYSQL
    - Data encryption - gMYSQL
    - Storage Capacity - gMYSQL (100G) Firestore - Minimum 1 TB
    - Concurrent Users - MYSQL
    - Scalability - MYSQL
    - Vertical Scalability not required - MYSQL
    - Regional - MYSQL
    - Cost - MYSQL / Firestore (204 / Month)
    
 IAM Policy
   
   Below service account and IAM policies to be applied for each resoource giving them least priviledge. Please find below high level role definition on each 	  resources, service accounts and IAM Roles. 
    
   ImageUI
   	
	Cloud Run - ImageUI ( ImageUI-ServiceAccount ) 
	- ImageTerraform-ServiceAccount - roles/run.admin
    
    
   ImageService 
   	
	Cloud Run - ImageService ( ImageService-ServiceAccount )
		
		- ImageUI-ServiceAccount/run.invoker
		- ImageTerraform-ServiceAccount - roles/run.admin

   ImageDB
   
   	Cloud Storage - ImageStorage ( ImageStorage-ServiceAccount )
	
		- ImageUI-ServiceAccount - roles/logging.viewAccessor
		- ImageTerraform-ServiceAccount - roles/run.admin
    
    
   ImageStorageBuckets
   
   	Cloud Storage - ImageStorage ( ImageStorage-ServiceAccount )
		
		- ImageUI-ServiceAccount - roles/logging.viewAccessor
		- ImageTerraform-ServiceAccount - roles/run.admin
    
    
   CloudLogging
    
        CloudLogging ( CloudLogging-ServiceAccount )
	
		- ImageUI-ServiceAccount - roles/logging.viewAccessor
 		- ImageUI-ServiceAccount - roles/logging.bucketWriter
 		- ImageService-ServiceAccount  - roles/logging.viewAccessor
 		- ImageService-ServiceAccount  - roles/logging.bucketWriter
 		- CloudMonitor-ServiceAccount  - roles/logging.viewer
        	- ImageDB-ServiceAccount roles/viewer

    
   Cloud Monitor
    
    	CloudMonitor ( CloudMonitor-ServiceAccount )
		
		- developer - roles/monitoring.viewer
		- ops/developer - roles/monitoring.editor
	
   Terraform 
   	
	Terraform-user (ImageTerraform-service-account )
	
   SecretManager 
   
         - ImageTerraform-ServiceAccount - roles/run.admin —> roles/roles/roles/secretmanager.secretVersionManager
         - ImageUI-ServiceAccount - roles/secretmanager.secretAccessor
         - ImageService-ServiceAccount - roles/secretmanager.secretAccessor 

   gitOps-Service-Account
    
	- roles/cloudbuild.builds.edito
	- container Registry Roles Upload Image
	
   Cloud Load Balancing (CloudLoadBalancing-ServiceAccount)
   
        - ImageTerraform-ServiceAccount - roles/compute.instanceAdmin
	
   Locust/GKE Service Accounts Defintion
   
        - IN PROGRESS

    
