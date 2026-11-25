function requiredSecret(name) {
    const value = process.env[name];
    if (!value || value.length < 32) {
        throw new Error(`${name} must be configured with at least 32 characters`);
    }
    return value;
}

module.exports = { requiredSecret };
