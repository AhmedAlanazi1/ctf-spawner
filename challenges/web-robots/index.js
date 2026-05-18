const express = require("express");
const app  = express();
const FLAG = process.env.FLAG ?? "prehackFlag{test}";

// robots.txt يشير لمسار مخفي
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(
    "User-agent: *\nDisallow: /s3cr3t-4dm1n-p4n3l\n"
  );
});

// الصفحة الرئيسية — موقع عادي
app.get("/", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>TechBlog</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,sans-serif;background:#f8f9fa;color:#212529}
  nav{background:#fff;border-bottom:1px solid #dee2e6;padding:16px 40px;display:flex;align-items:center;justify-content:space-between}
  nav h1{font-size:20px;font-weight:700;color:#0d6efd}
  nav a{color:#6c757d;text-decoration:none;font-size:14px}
  .hero{padding:80px 40px;text-align:center;background:linear-gradient(135deg,#0d6efd11,#6610f211)}
  .hero h2{font-size:40px;font-weight:800;margin-bottom:16px}
  .hero p{font-size:18px;color:#6c757d;max-width:600px;margin:0 auto}
  .posts{max-width:800px;margin:40px auto;padding:0 20px}
  .post{background:#fff;border:1px solid #dee2e6;border-radius:12px;padding:24px;margin-bottom:20px}
  .post h3{font-size:18px;margin-bottom:8px}
  .post p{color:#6c757d;font-size:14px}
  .tag{display:inline-block;background:#0d6efd22;color:#0d6efd;padding:2px 10px;border-radius:20px;font-size:12px;margin-bottom:10px}
</style></head>
<body>
  <nav><h1>TechBlog</h1><a href="/">الرئيسية</a></nav>
  <div class="hero">
    <h2>مرحباً بك في TechBlog</h2>
    <p>مدونة تقنية متخصصة في أمن المعلومات والبرمجة</p>
  </div>
  <div class="posts">
    <div class="post">
      <span class="tag">أمن معلومات</span>
      <h3>كيف تحمي موقعك من الاختراق</h3>
      <p>يتحدث هذا المقال عن أساليب الحماية الأساسية لأي موقع ويب...</p>
    </div>
    <div class="post">
      <span class="tag">برمجة</span>
      <h3>مقدمة في لغة Python</h3>
      <p>تعلم أساسيات Python خطوة بخطوة مع أمثلة عملية...</p>
    </div>
    <div class="post">
      <span class="tag">شبكات</span>
      <h3>فهم بروتوكول HTTP</h3>
      <p>شرح مفصل لكيفية عمل طلبات HTTP وكيف يتواصل المتصفح مع الخادم...</p>
    </div>
  </div>
</body></html>`);
});

// المسار المخفي — يحتوي على الفلاق
app.get("/s3cr3t-4dm1n-p4n3l", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Admin Panel</title>
<style>
  body{font-family:monospace;background:#0d0d0d;color:#00ff41;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .box{background:#111;border:1px solid #00ff41;padding:40px;border-radius:8px;text-align:center;max-width:500px}
  h2{margin-bottom:20px;color:#ffff00}
  .flag{background:#001a00;border:1px solid #00ff41;padding:16px;border-radius:6px;font-size:18px;color:#00ff41;word-break:break-all;margin-top:16px}
  p{color:#888;font-size:13px;margin-top:12px}
</style></head>
<body><div class="box">
  <h2>🔓 Admin Panel</h2>
  <p style="color:#ccc">وجدت المسار المخفي — هذا هو الفلاق:</p>
  <div class="flag">${FLAG}</div>
  <p>robots.txt always tells the truth 🤖</p>
</div></body></html>`);
});

app.listen(process.env.PORT ?? 3000, () => console.log("web-robots running"));
