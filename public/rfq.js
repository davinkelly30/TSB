async function submitRFQ(){
  const data = {
    name: document.getElementById("name").value,
    company: document.getElementById("company").value,
    email: document.getElementById("email").value,
    message: document.getElementById("msg").value
  };

  await fetch("http://localhost:3000/rfq", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(data)
  });

  alert("RFQ submitted");
}