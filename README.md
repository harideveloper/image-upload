# image-upload


Assmuptions 

<img width="899" alt="1_Assumptions" src="https://user-images.githubusercontent.com/25478952/123878412-ea761280-d936-11eb-81d3-646a34d46f49.png">




Application Technical Stack



      Front End : React JS
      Backend : Node JS, Express JS 
      Database : MySQL
      Storage : Google Storage Buckets 
      Containerisation : Docker
      LoadTest Application : python/kubernetes
      
        
      
<img width="991" alt="Application-Design" src="https://user-images.githubusercontent.com/25478952/123872760-6e2b0180-d92d-11eb-8cce-4c7569334d84.png">
      


Application Overview

    * Application is three tiered architecture with web requests served by react js frontend application. 
    * User authentication is verified by Google IAP Platform with Google Sign-in
    * Backend Node JS Microservice recives image upload and view images requests
    * Google Storage Buckets to upload the images
    * MySQL database to update the signed URLs
    * Terraform Project to create environment resources
    * CI/CD Triggers - Cloud Build
    * Application code hosted in GitHUB repository 
  




High Level GCP Design

<img width="1056" alt="3_GCP-Design-High-Level" src="https://user-images.githubusercontent.com/25478952/123877936-0c22ca00-d936-11eb-94e6-3f971fe2d1f9.png">





Design Considerations (Cloud Run & GKE)

    * Cost                                    ( Cloud Run >> GKE )
    * Administration Efforts	                ( Cloud Run >> GKE )
    * Deployment Deadline / Project Timeline 	( Cloud Run >> GKE )
    * Efforts to build                        ( Cloud Run >> GKE )
    * Resources Capability                    ( GKE >> Cloud Run )
    * Security 	                              ( GKE >> Cloud Run )
    * Portability/Migration/Vendor Dependent  ( GKE >> Cloud Run )
    * Test vs Prod                            ( GKE >> Cloud Run )





Detailed GCP Cluster
  
<img width="1008" alt="Image-Cluster-AD" src="https://user-images.githubusercontent.com/25478952/123874817-a08a2e00-d930-11eb-9a10-a7559c039ff1.png">


Load Balancer Design


<img width="797" alt="6_Image-Load Balancer-AD" src="https://user-images.githubusercontent.com/25478952/123878967-fa422680-d937-11eb-8c2a-0ab027a4474e.png">



Detailed E2E GCP Design

<img width="1421" alt="5_Image-E2E-AD" src="https://user-images.githubusercontent.com/25478952/123878609-4d67a980-d937-11eb-9e43-54a6d8089095.png">



Detailed CI/CD Design

<img width="787" alt="7_Image-gitOps" src="https://user-images.githubusercontent.com/25478952/123878698-8273fc00-d937-11eb-90ec-c45e42a54962.png">



Locust App Design

<img width="810" alt="8_Image-Locust-Cluster-AD" src="https://user-images.githubusercontent.com/25478952/123879188-70468d80-d938-11eb-8075-e44f4a20f50c.png">



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
   
   
    - Table Design
 
	Table Name : IMAGE
	   Columns: 
	    id (auto-increment) 
	    signed-url VARCHAR(512) 
	    expiration (TIMESTAMP)
	    userinfo-id VARCHAR(2) 
	    update-time-stamp (TIMESTAMP)

	Table Name : USERINFO
	   Columns : 
	    id (auto-increment) 
            email-id : VARCHAR(255)
            update-time-stamp (TIMESTAMP)
	    
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
 
 
 <img width="998" alt="9_IAM-Policy" src="https://user-images.githubusercontent.com/25478952/123883005-eac6db80-d93f-11eb-8dcd-36c058865e51.png">

   
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

Environment Sizing (Technical)

    * Production Environment 
      * 10000 Requests for Month (Roughly)
      * Average concurrent users 50 (Roughly)
    * NFT Environment (Same as prod)
      * 10000 Requests for Month (Roughly)
      * Average concurrent users 50 (Roughly)
    * Staging Environment 
      * 2500 Requests for Month (Roughly)
      * Average concurrent users 5 (Roughly)
      
      
      
    
curl -m 130 -X POST "https://europe-west2-rag-accelerator-dev-e694.cloudfunctions.net/signedurlservice" \
-H "Authorization: Bearer $(gcloud auth print-identity-token)" \
-H "api-key: testkey12345" \ 
-H "Content-Type: application/json" \
-d '{
  "fileName": "test.txt",
  "contentType": "text/plain"
}'