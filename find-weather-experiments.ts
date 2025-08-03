import dotenv from "dotenv";
dotenv.config();

async function findWeatherExperiments() {
  const BRAINTRUST_API_KEY = process.env.BRAINTRUST_API_KEY;
  const projectName = process.env.BRAINTRUST_PROJECT_NAME;
  
  console.log('Finding Weather Agent experiments...');
  console.log('Project Name:', projectName);
  
  if (!BRAINTRUST_API_KEY || !projectName) {
    console.error('Missing required environment variables');
    return;
  }

  try {
    // Get project
    const projectsResponse = await fetch('https://api.braintrust.dev/v1/project', {
      headers: {
        'Authorization': `Bearer ${BRAINTRUST_API_KEY}`,
      },
    });
    
    const projects = await projectsResponse.json();
    const project = projects.objects.find((p: any) => p.name === projectName);
    
    if (!project) {
      console.error('Project not found');
      return;
    }
    
    console.log('\nProject found:', project.name, 'ID:', project.id);

    // Get all experiments
    const experimentsResponse = await fetch(`https://api.braintrust.dev/v1/experiment?project_id=${project.id}`, {
      headers: {
        'Authorization': `Bearer ${BRAINTRUST_API_KEY}`,
      },
    });
    
    const experiments = await experimentsResponse.json();
    console.log('\nChecking all experiments for weather agent data...\n');
    
    // Check each experiment for weather data
    for (const exp of experiments.objects) {
      console.log(`\nChecking experiment: ${exp.name}`);
      console.log('Tags:', exp.tags || 'none');
      
      // Fetch some records to check content
      const dataResponse = await fetch(`https://api.braintrust.dev/v1/experiment/${exp.id}/fetch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BRAINTRUST_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: 3,
          filters: [],
        }),
      });
      
      if (!dataResponse.ok) {
        console.log('  Failed to fetch data');
        continue;
      }
      
      const data = await dataResponse.json();
      
      if (data.events && data.events.length > 0) {
        const firstEvent = data.events[0];
        
        // Check if this looks like weather agent data
        const hasWeatherContent = JSON.stringify(firstEvent).toLowerCase().includes('weather');
        const hasInstructions = 
          firstEvent.metadata?.instructions || 
          firstEvent.metadata?.actualInstructions ||
          firstEvent.metadata?.parameters?.instructions;
        
        if (hasWeatherContent || hasInstructions) {
          console.log('  ✓ Contains weather-related data!');
          console.log('  First record input:', JSON.stringify(firstEvent.input).substring(0, 200) + '...');
          console.log('  Metadata keys:', Object.keys(firstEvent.metadata || {}));
          
          if (hasInstructions) {
            const instructions = 
              firstEvent.metadata?.instructions || 
              firstEvent.metadata?.actualInstructions ||
              firstEvent.metadata?.parameters?.instructions;
            console.log('  ✓ Has instructions:', instructions.substring(0, 100) + '...');
          }
          
          // Check if it's the main eval runs (not scoring runs)
          if (firstEvent.input && typeof firstEvent.input === 'string' && firstEvent.input.includes('weather')) {
            console.log('  ✓ This appears to be a weather agent evaluation!');
            console.log('\n  To use this experiment:');
            console.log(`  1. Tag it with "Prod" in the Braintrust UI`);
            console.log(`  2. Or update your code to look for experiment name: "${exp.name}"`);
          }
        } else {
          console.log('  ✗ Not weather-related');
        }
      } else {
        console.log('  No records found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findWeatherExperiments();