// JWT validation functions for Nginx
// Note: This is a simplified implementation. In production, use a proper JWT library

function jwtUserId(r) {
    var token = r.variables.jwt_payload;
    if (!token) {
        return "";
    }
    
    try {
        // Remove "Bearer " prefix if present
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        
        // Split JWT parts
        var parts = token.split('.');
        if (parts.length !== 3) {
            return "";
        }
        
        // Decode payload (base64url)
        var payload = parts[1];
        // Add padding if needed
        while (payload.length % 4) {
            payload += '=';
        }
        
        var decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        var jwtData = JSON.parse(decoded);
        
        // Check expiration
        if (jwtData.exp && jwtData.exp < Math.floor(Date.now() / 1000)) {
            return "";
        }
        
        // Return user ID
        return jwtData.userId || jwtData.sub || "";
        
    } catch (e) {
        r.log("JWT validation error: " + e.message);
        return "";
    }
}

function jwtValidate(r) {
    var token = r.variables.jwt_payload;
    if (!token) {
        return false;
    }
    
    try {
        // Remove "Bearer " prefix if present
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        
        // Split JWT parts
        var parts = token.split('.');
        if (parts.length !== 3) {
            return false;
        }
        
        // Decode payload
        var payload = parts[1];
        while (payload.length % 4) {
            payload += '=';
        }
        
        var decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        var jwtData = JSON.parse(decoded);
        
        // Check expiration
        if (jwtData.exp && jwtData.exp < Math.floor(Date.now() / 1000)) {
            return false;
        }
        
        // Check issuer (optional)
        if (jwtData.iss && jwtData.iss !== "interview-backend") {
            return false;
        }
        
        // Check audience (optional)
        if (jwtData.aud && jwtData.aud !== "interview-api") {
            return false;
        }
        
        return true;
        
    } catch (e) {
        r.log("JWT validation error: " + e.message);
        return false;
    }
}

function jwtUserRole(r) {
    var token = r.variables.jwt_payload;
    if (!token) {
        return "";
    }
    
    try {
        // Remove "Bearer " prefix if present
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        
        // Split JWT parts
        var parts = token.split('.');
        if (parts.length !== 3) {
            return "";
        }
        
        // Decode payload
        var payload = parts[1];
        while (payload.length % 4) {
            payload += '=';
        }
        
        var decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        var jwtData = JSON.parse(decoded);
        
        // Check expiration
        if (jwtData.exp && jwtData.exp < Math.floor(Date.now() / 1000)) {
            return "";
        }
        
        return jwtData.role || "USER";
        
    } catch (e) {
        r.log("JWT role extraction error: " + e.message);
        return "";
    }
}

// Export functions
export default {
    jwtUserId,
    jwtValidate,
    jwtUserRole
};
