# Delivery Partner Dashboard & Location-Based Notifications

## Overview

The FarmConnect delivery partner system provides real-time, location-based order notifications to delivery partners when customers place orders. The system automatically notifies nearby delivery partners based on their current location and the delivery address.

## Features

### 🚚 **Location-Based Order Notifications**
- Automatic notifications to delivery partners within a configurable radius (5-20km)
- Real-time WebSocket notifications with sound alerts
- Distance calculation using Haversine formula for accuracy
- Priority-based notifications (urgent, high, normal)

### 📱 **Enhanced Delivery Dashboard**
- **Available Orders Tab**: Shows nearby orders available for pickup
- **Active Deliveries Tab**: Manage current delivery assignments
- **Completed Tab**: View delivery history and performance
- **Real-time Stats**: Track earnings, success rate, and delivery counts

### 🔔 **Smart Notification System**
- Pop-up notifications with order details
- Audio alerts for new orders
- Auto-dismiss for orders accepted by other partners
- Customizable search radius (5km to 20km)

### 📍 **Location Tracking**
- Continuous GPS tracking for accurate positioning
- Online/offline status management
- Automatic location updates to server
- Privacy-controlled location sharing

## How It Works

### For Delivery Partners

1. **Go Online**: Toggle your online status to start receiving notifications
2. **Location Access**: Enable GPS for accurate location-based matching
3. **Receive Notifications**: Get instant alerts for nearby orders
4. **Accept Orders**: One-click acceptance with estimated pickup time
5. **Track Progress**: Update delivery status in real-time

### Order Flow

```
Customer Places Order
        ↓
System Calculates Nearby Partners (within radius)
        ↓
Real-time Notifications Sent
        ↓
Partner Accepts Order
        ↓
Order Assignment & Status Updates
        ↓
Delivery Tracking & Completion
```

## API Endpoints

### Order Notifications
- `POST /api/order-notifications/notify-delivery-partners` - Notify nearby partners
- `GET /api/order-notifications/available-orders` - Get nearby available orders
- `POST /api/order-notifications/accept-order/:orderId` - Accept an order
- `PUT /api/order-notifications/update-location` - Update partner location
- `GET /api/order-notifications/stats` - Get delivery statistics

### Delivery Management
- `GET /api/delivery/assigned` - Get assigned deliveries
- `PUT /api/delivery/:id/status` - Update delivery status
- `PUT /api/delivery/:id/location` - Update delivery location

## Configuration

### Environment Variables
```env
API_BASE_URL=http://localhost:5000
MONGODB_URI=mongodb://localhost:27017/farmconnect
```

### Default Settings
- **Notification Radius**: 10km (configurable 5-20km)
- **Max Notifications**: 5 simultaneous notifications
- **Location Update Interval**: 30 seconds during active delivery
- **Notification Timeout**: 5 minutes auto-dismiss

## Technical Implementation

### Backend Components
1. **orderNotifications.js** - Location-based notification logic
2. **WebSocket Integration** - Real-time communication
3. **Distance Calculation** - Haversine formula for accuracy
4. **Database Indexing** - Geospatial indexes for performance

### Frontend Components
1. **OrderNotifications.js** - Notification popup component
2. **DeliveryDashboard.js** - Enhanced dashboard with location features
3. **Location Services** - GPS tracking and updates

### Database Schema Updates
- Added geospatial indexes for location queries
- Enhanced User model with delivery partner location fields
- Delivery tracking with route points and timestamps

## Usage Instructions

### For Delivery Partners

#### Getting Started
1. **Login** to your delivery partner account
2. **Enable Location** when prompted by the browser
3. **Go Online** using the toggle button in the dashboard
4. **Set Search Radius** (5-20km) for order notifications

#### Receiving Orders
1. **Notification Popup** appears for nearby orders
2. **Review Details**: Distance, customer info, order value
3. **Accept or Dismiss** the notification
4. **Automatic Assignment** once accepted

#### Managing Deliveries
1. **Pick Up**: Mark order as picked up when collected
2. **In Transit**: Update status when starting delivery
3. **Location Updates**: Automatic GPS tracking during delivery
4. **Complete**: Mark as delivered with confirmation

### For Administrators

#### Monitoring
- Track delivery partner locations and availability
- Monitor notification response rates
- Analyze delivery performance metrics
- Manage partner assignments and territories

#### Configuration
- Adjust notification radius limits
- Set priority rules for urgent orders
- Configure notification timeouts
- Manage partner verification status

## Performance Metrics

### Key Indicators
- **Response Time**: Average time to accept notifications
- **Success Rate**: Percentage of completed deliveries
- **Coverage Area**: Geographic distribution of partners
- **Customer Satisfaction**: Delivery ratings and feedback

### Dashboard Analytics
- Daily/weekly delivery counts
- Earnings tracking
- Average delivery time
- Success rate percentage

## Troubleshooting

### Common Issues

#### Location Not Working
- **Solution**: Enable browser location permissions
- **Check**: GPS is enabled on device
- **Verify**: Location services are running

#### No Notifications Received
- **Check**: Online status is enabled
- **Verify**: Location is being tracked
- **Confirm**: Within notification radius of orders

#### WebSocket Connection Issues
- **Solution**: Refresh the page
- **Check**: Network connectivity
- **Verify**: Server is running

### Support
For technical issues or questions:
1. Check browser console for error messages
2. Verify network connectivity
3. Ensure location permissions are granted
4. Contact system administrator if issues persist

## Security & Privacy

### Data Protection
- Location data encrypted in transit
- Minimal location storage (current position only)
- User consent required for location tracking
- Automatic data cleanup for inactive partners

### Access Control
- Role-based authentication for delivery partners
- Secure WebSocket connections
- API rate limiting for protection
- Input validation and sanitization

## Future Enhancements

### Planned Features
- **Route Optimization**: AI-powered delivery route planning
- **Predictive Analytics**: Demand forecasting for better positioning
- **Multi-language Support**: Localized notifications and interface
- **Advanced Filtering**: Delivery preferences and specializations
- **Integration APIs**: Third-party logistics platform connections

### Performance Improvements
- **Caching**: Redis for frequently accessed data
- **Load Balancing**: Multiple server instances
- **Database Optimization**: Advanced indexing strategies
- **Mobile App**: Native mobile application for better performance

---

## Quick Start Checklist

- [ ] Enable location access in browser
- [ ] Toggle online status to "Online"
- [ ] Set preferred notification radius
- [ ] Test notification sound
- [ ] Complete first delivery assignment
- [ ] Review performance stats

**Ready to start delivering!** 🚚📦
