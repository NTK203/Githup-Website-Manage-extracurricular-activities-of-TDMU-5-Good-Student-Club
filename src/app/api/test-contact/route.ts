import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import ContactRequest from '@/models/ContactRequest';

export async function GET() {
  try {
    console.log('🧪 Testing contact API...');
    
    // Test database connection
    await dbConnect();
    console.log('✅ Database connected');
    
    // Test model
    console.log('✅ ContactRequest model:', !!ContactRequest);
    
    // Test creating a simple contact request
    const testRequest = new ContactRequest({
      userId: '507f1f77bcf86cd799439011', // Test ObjectId
      userName: 'Test User',
      userEmail: 'test@example.com',
      subject: 'Test Subject',
      message: 'Test Message',
      priority: 'MEDIUM'
    });
    
    console.log('✅ Test contact request created');
    
    return NextResponse.json({
      success: true,
      message: 'Contact API test successful',
      data: {
        modelAvailable: !!ContactRequest,
        testRequest: {
          subject: testRequest.subject,
          message: testRequest.message
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Contact API test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Contact API test failed',
      details: (error as Error).message
    }, { status: 500 });
  }
}
