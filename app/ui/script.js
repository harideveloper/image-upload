const api = "https://europe-west2-rag-accelerator-dev-e694.cloudfunctions.net/signedurlservice"; 
//const api = "https://europe-west2-rag-accelerator-dev-e694.cloudfunctions.net/test1"; 

// Performs backend api health 
async function healthCheck() {
  const resultElement = document.getElementById("result");
  resultElement.style.display = "block";
  resultElement.textContent = "Loading...";

  try {
    const response = await fetch(api, { method: "GET" });
    const data = await response.json();
    resultElement.textContent = `Health Check : ${data.message} Timestamp : ${data.timestamp} `;
  } catch (error) {
    console.error("Error:", error);
    resultElement.textContent = `Error: ${error.message}`;
  }
}

// Upload file function to upload the files
async function fileUpload() {
  const fileInput = document.getElementById("fileInput");
  const resultElement = document.getElementById("result");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file to upload.");
    return;
  }

  resultElement.style.display = "block"; 
  resultElement.textContent = "Uploading...";

  try {
    // Generate signed URL
    const response = await fetch(api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename: file.name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate signed URL");
    }

    const data = await response.json();

    // Upload the file using generated signed URL
    const uploadResponse = await fetch(data.signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: file,
    });

    if (uploadResponse.ok) {
      resultElement.textContent = `File uploaded successfully: ${file.name}`;
    } else {
      throw new Error("Failed to upload file");
    }
  } catch (error) {
    console.error("Error:", error);
    resultElement.textContent = `Error: ${error.message}`;
  }
}
