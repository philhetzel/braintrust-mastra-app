import dotenv from "dotenv";
dotenv.config();

async function checkWeatherEvalExperiment() {
  const BRAINTRUST_API_KEY = process.env.BRAINTRUST_API_KEY;
  const projectName = process.env.BRAINTRUST_PROJECT_NAME;
  
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

    // Get experiments
    const experimentsResponse = await fetch(`https://api.braintrust.dev/v1/experiment?project_id=${project.id}`, {
      headers: {
        'Authorization': `Bearer ${BRAINTRUST_API_KEY}`,
      },
    });
    
    const experiments = await experimentsResponse.json();
    
    // Find the weather-eval experiment (without the random suffix)
    const weatherEvalExp = experiments.objects.find((exp: any) => 
      exp.name === 'MastraAppTest [experimentName=weather-eval-2025-07-28]'
    );
    
    if (!weatherEvalExp) {
      console.error('Weather eval experiment not found');
      return;
    }
    
    console.log('Found weather eval experiment:', weatherEvalExp.name);
    console.log('ID:', weatherEvalExp.id);
    
    // Fetch records with metadata
    const dataResponse = await fetch(`https://api.braintrust.dev/v1/experiment/${weatherEvalExp.id}/fetch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRAINTRUST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: 10,
        filters: [],
      }),
    });
    
    if (!dataResponse.ok) {
      console.error('Failed to fetch data');
      return;
    }
    
    const data = await dataResponse.json();
    console.log('\nTotal records:', data.events?.length || 0);
    
    if (data.events && data.events.length > 0) {
      console.log('\nChecking records for instructions in metadata...\n');
      
      data.events.forEach((event: any, index: number) => {
        console.log(`Record ${index + 1}:`);
        
        // Check input type
        const inputType = Array.isArray(event.input) ? 'array' : typeof event.input;
        console.log('  Input type:', inputType);
        
        if (Array.isArray(event.input) && event.input.length > 0) {
          const firstMsg = event.input[0];
          console.log('  First input message role:', firstMsg.role);
          console.log('  First input preview:', JSON.stringify(firstMsg.content).substring(0, 100) + '...');
        } else if (typeof event.input === 'string') {
          console.log('  Input preview:', event.input.substring(0, 100) + '...');
        }
        
        // Check metadata
        console.log('  Metadata:', JSON.stringify(event.metadata, null, 2));
        
        // Look for instructions
        const instructions = 
          event.metadata?.instructions || 
          event.metadata?.actualInstructions ||
          event.metadata?.parameters?.instructions;
          
        if (instructions) {
          console.log('  ✓ FOUND INSTRUCTIONS:', instructions.substring(0, 200) + '...');
        }
        
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkWeatherEvalExperiment();