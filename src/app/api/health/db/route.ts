import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET() {
  try {
    // Check environment variable
    const hasMongoUri = !!process.env.MONGODB_URI;
    
    if (!hasMongoUri) {
      return NextResponse.json({
        success: false,
        error: 'MONGODB_URI environment variable is not set',
        details: {
          envVarConfigured: false,
          connectionState: 'not_configured'
        }
      }, { status: 500 });
    }

    // Check current connection state
    const connectionState = mongoose.connection.readyState;
    const stateMap: { [key: number]: string } = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // Try to connect
    try {
      await dbConnect();
      
      // Check if connected
      const isConnected = mongoose.connection.readyState === 1;
      const dbName = mongoose.connection.db?.databaseName;
      
      // Try a simple query to verify connection works
      const adminDb = mongoose.connection.db?.admin();
      let pingResult = null;
      if (adminDb) {
        try {
          pingResult = await adminDb.ping();
        } catch (pingError) {
          console.warn('Ping failed but connection exists:', pingError);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Database connection successful',
        details: {
          envVarConfigured: true,
          connectionState: stateMap[connectionState] || 'unknown',
          isConnected,
          dbName: dbName || 'db-sv5tot-tdmu',
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          ping: pingResult ? 'ok' : 'not_available'
        }
      });
    } catch (connectionError: any) {
      const errorMessage = connectionError instanceof Error ? connectionError.message : String(connectionError);
      
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: {
          envVarConfigured: true,
          connectionState: stateMap[connectionState] || 'error',
          errorMessage: errorMessage,
          // Mask sensitive info in error message
          maskedError: errorMessage.replace(/mongodb\+srv:\/\/[^@]+@/g, 'mongodb+srv://***:***@')
        }
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      details: {
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}
