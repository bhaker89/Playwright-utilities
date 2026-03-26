const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class ServiceRegistry {
    constructor() {
        this.services = new Map();
        this.servicesDir = path.resolve(__dirname);
    }

    loadServices() {
        const entries = fs.readdirSync(this.servicesDir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory() && entry.name !== '_template' && !entry.name.startsWith('.')) {
                this.loadService(entry.name);
            }
        }
    }

    loadService(serviceName) {
        const configPath = path.join(this.servicesDir, serviceName, 'config.yaml');
        if (fs.existsSync(configPath)) {
            try {
                const configContent = fs.readFileSync(configPath, 'utf8');
                const config = yaml.load(configContent);
                this.services.set(serviceName, config);
            } catch (error) {
                console.error(`Failed to load service ${serviceName}:`, error);
            }
        }
    }

    getService(serviceName) {
        return this.services.get(serviceName);
    }
}

module.exports = new ServiceRegistry();
