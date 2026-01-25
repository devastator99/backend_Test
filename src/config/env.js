require('dotenv').config();

/**
 * Validates required environment variables
 * @returns {boolean} True if all required variables are present
 */
function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Please check your .env file or environment configuration.');
    return false;
  }
  
  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters long for security');
  }
  
  // Validate port
  const port = parseInt(process.env.PORT || '3000');
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('❌ PORT must be a valid number between 1 and 65535');
    return false;
  }
  
  console.log('✅ Environment variables validated successfully');
  return true;
}

module.exports = { validateEnvironment };
