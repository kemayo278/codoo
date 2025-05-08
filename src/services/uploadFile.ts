// File upload service using XMLHttpRequest

export const uploadFile = (
    file: File,
    type: string
  ): Promise<{ name: string }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
  
      formData.append("file", file);
      formData.append("type", type);
  
    xhr.open("POST", process.env.NEXT_PUBLIC_STORE_FILE_URL as string, true);
  
      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response.data);
            } catch (e) {
                console.error("Error parsing response:", e);
              reject(new Error("Invalid response from server."));
            }
          } else {
            reject(new Error("File upload failed."));
          }
        }
      };
  
      xhr.send(formData);
    });
  };
  