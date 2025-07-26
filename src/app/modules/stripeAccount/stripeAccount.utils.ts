export const successHTMLstripeConnection = (user: {
    name: string;
    email: string;
    profileImg?: string;
  }) => `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background-color: #f3f4f6;
    ">
      <div style="
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #ffffff;
        padding: 24px;
        border-radius: 12px;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 6px 18px rgba(0,0,0,0.1);
        text-align: center;
      ">
        <img src="${user.profileImg}" alt="${user.name}" style="
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #4f46e5;
          margin-bottom: 16px;
        " />
        <h2 style="color: #4f46e5; margin-bottom: 8px;">Welcome, ${user.name}!</h2>
        <p style="color: #374151; font-size: 16px; margin-bottom: 16px;">
          Your Stripe connected account has been successfully created.
        </p>
        <div style="
          background-color: #e0e7ff;
          padding: 12px;
          border-radius: 8px;
          color: #1e3a8a;
          font-size: 14px;
          margin-bottom: 16px;
        ">
          <strong>Email:</strong> ${user.email}
        </div>
        <a href="https://dashboard.stripe.com" style="
          display: inline-block;
          background-color: #4f46e5;
          color: white;
          padding: 10px 20px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 500;
          transition: background 0.3s ease;
        " target="_blank">
          Go to Stripe Dashboard
        </a>
      </div>
    </div>
  `;