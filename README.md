# FarmConnect - Farm to Consumer Marketplace

FarmConnect is a comprehensive web application that connects farmers directly with consumers, enabling fresh produce sales through a modern marketplace platform.

## Features

### 🌱 Multi-Role Platform
- **Sellers (Farmers)**: List and manage products, handle purchase requests
- **Buyers (Consumers)**: Browse products, make purchase requests, track orders

### 🛒 Core Functionality
- Product listing with images, categories, and detailed information
- Real-time purchase request system
- Role-based dashboards
- User authentication and profiles
- Search and filter capabilities
- Responsive design for all devices

### 🔧 Technical Stack
- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io for notifications
- **Authentication**: JWT tokens
- **File Upload**: Multer for image handling

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone and setup the project:**
```bash
cd FarmConnect
npm run install-deps
```

2. **Configure environment variables:**
Create a `.env` file in the `backend` directory:
```env
MONGODB_URI=mongodb://localhost:27017/farmconnect
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
NODE_ENV=development
```

3. **Start MongoDB:**
Make sure MongoDB is running on your system.

4. **Run the application:**
```bash
# Start both frontend and backend
npm run dev

# Or run separately:
# Backend (from backend directory)
npm run dev

# Frontend (from frontend directory)
npm start
```

5. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Project Structure

```
FarmConnect/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication middleware
│   ├── uploads/         # File uploads
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   └── App.js       # Main app component
│   └── public/          # Static files
└── package.json         # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (sellers only)
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Requests
- `POST /api/requests` - Create purchase request
- `GET /api/requests/my-requests` - Get user's requests
- `PATCH /api/requests/:id/status` - Update request status

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## Usage Guide

### For Sellers (Farmers)
1. Register as a seller
2. Complete your profile with farm details
3. Add products with images and descriptions
4. Manage incoming purchase requests
5. Accept/reject requests and coordinate delivery

### For Buyers (Consumers)
1. Register as a buyer
2. Browse available products
3. Use filters to find specific items
4. Make purchase requests with quantity and delivery details
5. Track request status in your dashboard

## Features in Detail

### Product Management
- Multiple image uploads
- Category-based organization
- Organic certification marking
- Inventory tracking
- Location-based filtering

### Request System
- Real-time notifications
- Status tracking (pending, accepted, rejected, completed)
- Delivery address management
- Price negotiation capability

### User Experience
- Responsive design for mobile and desktop
- Real-time notifications via Socket.io
- Toast notifications for user feedback
- Loading states and error handling

## Development

### Adding New Features
1. Backend: Add routes in `backend/routes/`
2. Frontend: Create components in `frontend/src/components/`
3. Update API calls and state management as needed

### Database Schema
- **Users**: Authentication, profiles, roles
- **Products**: Listings, images, seller info
- **Requests**: Purchase requests, status tracking

## Deployment

### Production Setup
1. Set up MongoDB Atlas or production database
2. Configure environment variables for production
3. Build the frontend: `cd frontend && npm run build`
4. Deploy backend to your preferred hosting service
5. Serve frontend build files

### Environment Variables
```env
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_secure_jwt_secret
PORT=5000
NODE_ENV=production
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For support and questions:
- Email: jagatheeshlogu005@gmail.com
- Phone: +91 9042474771



---

Built with ❤️ for farmers and consumers by the FarmConnect team.
