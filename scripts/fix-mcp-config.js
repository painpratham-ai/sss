const fs = require('fs');
const path = require('path');

const configPath = 'C:\\Users\\HP\\.gemini\\config\\mcp_config.json';

try {
  const content = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(content);
  
  if (config.mcpServers && config.mcpServers['firebase-mcp-server']) {
    config.mcpServers['firebase-mcp-server'] = {
      "$typeName": "exa.cascade_plugins_pb.CascadePluginCommandTemplate",
      "command": "firebase",
      "args": ["mcp"],
      "env": {}
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('Successfully updated firebase-mcp-server configuration in mcp_config.json!');
  } else {
    console.error('Could not find firebase-mcp-server in mcp_config.json.');
  }
} catch (err) {
  console.error('Error modifying mcp_config.json:', err);
}
