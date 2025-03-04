
DROP TABLE IF EXISTS file_activity_log, file_scan_results;


CREATE TABLE file_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  
    correlation_id VARCHAR(255) NOT NULL,            
    user_id VARCHAR(255) NOT NULL,                   
    file_name VARCHAR(255) NOT NULL,                 
    file_path TEXT NOT NULL,                         
    file_size BIGINT NOT NULL,                       
    file_type VARCHAR(50),                           
    file_status VARCHAR(20),                         
    created_time TIMESTAMP DEFAULT NOW()
);

CREATE TABLE file_scan_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    correlation_id VARCHAR(255) NOT NULL,    
    user_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,                         
    scan_status VARCHAR(20),                          
    sensitive_data_found BOOLEAN DEFAULT FALSE,
    sensitive_data_types VARCHAR(255),
    scan_time TIMESTAMP DEFAULT NOW()                 
);


-- Downloads
-- CREATE TABLE downloads (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
--     user_id VARCHAR(255) NOT NULL,                   
--     file_id UUID NOT NULL,                           
--     download_time TIMESTAMP DEFAULT NOW(),           
--     ip_address VARCHAR(45) NOT NULL                  
-- );

-- PII Data Tables 

SELECT * FROM file_activity_log;
SELECT * FROM file_scan_results;


