/*==============================================================================
Simple Event Example
Copyright (c), Firelight Technologies Pty, Ltd 2012-2019.

This example demonstrates the various ways of playing an event.

#### Explosion Event ####
This event is played as a one-shot and released immediately after it has been
created.

#### Looping Ambience Event ####
A single instance is started or stopped based on user input.

#### Cancel Event ####
This instance is started and if already playing, restarted.
==============================================================================*/

//==============================================================================
// Prerequisite code needed to set up FMOD object.  See documentation.
//==============================================================================

var FMOD = {};                          // FMOD global object which must be declared to enable 'main' and 'preRun' and then call the constructor function.
FMOD['preRun'] = prerun;                // Will be called before FMOD runs, but after the Emscripten runtime has initialized
FMOD['onRuntimeInitialized'] = main;    // Called when the Emscripten runtime has initialized
FMOD['INITIAL_MEMORY'] = 64*1024*1024;  // FMOD Heap defaults to 16mb which is enough for this demo, but set it differently here for demonstration (64mb)
FMODModule(FMOD);                       // Calling the constructor function with our object

//==============================================================================
// Example code
//==============================================================================

var gSystem;                            // Global 'System' object which has the Studio API functions.
var gSystemCore;                        // Global 'SystemCore' object which has the Core API functions.
var loopingAmbienceInstance = {};       // Global Event Instance for the looping ambience event.  A single instance is started or stopped based on user input.
var gAudioResumed  = false;             // Boolean to avoid resetting FMOD on IOS/Chrome every time screen is touched.

// Simple error checking function for all FMOD return values.
function CHECK_RESULT(result)
{
    if (result != FMOD.OK)
    {
        var msg = "Error!!! '" + FMOD.ErrorString(result) + "'";

        alert(msg);

        throw msg;
    }
}

// Will be called before FMOD runs, but after the Emscripten runtime has initialized
// Call FMOD file preloading functions here to mount local files.  Otherwise load custom data from memory or use own file system. 
function prerun() 
{
    console.log('FMOD preRun. Mounting files...');

    var fileUrl = "/assets/media/";
    var fileName;
    var folderName = "/";
    var canRead = true;
    var canWrite = false;

    fileName = [
        "Master.bank",
        "Master.strings.bank",
    ];

    for (var count = 0; count < fileName.length; count++)
    {
        //document.querySelector("#display_out2").value = "Loading " + fileName[count] + "...";

        FMOD.FS_createPreloadedFile(folderName, fileName[count], fileUrl + fileName[count], canRead, canWrite);
        console.log(count+" Bank")
    }
      console.log('Finished Prerun');
}

// Called when the Emscripten runtime has initialized
function main()
{
    // A temporary empty object to hold our system
    var outval = {};
    var result;

    console.log("Creating FMOD System object\n");

    // Create the system and check the result
    result = FMOD.Studio_System_Create(outval);
    CHECK_RESULT(result);

    console.log("grabbing system object from temporary and storing it\n");

    // Take out our System object
    gSystem = outval.val;

    result = gSystem.getCoreSystem(outval);
    CHECK_RESULT(result);

    gSystemCore = outval.val;
    
    // Optional.  Setting DSP Buffer size can affect latency and stability.
    // Processing is currently done in the main thread so anything lower than 2048 samples can cause stuttering on some devices.
    console.log("set DSP Buffer size.\n");
    result = gSystemCore.setDSPBufferSize(2048, 2);
    CHECK_RESULT(result);
    
    // Optional.  Set sample rate of mixer to be the same as the OS output rate.
    // This can save CPU time and latency by avoiding the automatic insertion of a resampler at the output stage.
    console.log("Set mixer sample rate");
    result = gSystemCore.getDriverInfo(0, null, null, outval, null, null);
    CHECK_RESULT(result);
    result = gSystemCore.setSoftwareFormat(outval.val, FMOD.SPEAKERMODE_DEFAULT, 0)
    CHECK_RESULT(result);

    console.log("initialize FMOD\n");

    // 1024 virtual channels
    result = gSystem.initialize(1024, FMOD.STUDIO_INIT_NORMAL, FMOD.INIT_NORMAL, null);
    CHECK_RESULT(result);
   
    // Starting up your typical JavaScript application loop
    console.log("initialize Application\n");

    initApplication();

    // Set up iOS/Chrome workaround.  Webaudio is not allowed to start unless screen is touched or button is clicked.
    function resumeAudio() 
    {
        if (!gAudioResumed)
        {

            result = gSystemCore.mixerSuspend();
            CHECK_RESULT(result);
            result = gSystemCore.mixerResume();
            CHECK_RESULT(result);

            gAudioResumed = true;
        }

    }

    var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (iOS)
    {
        window.addEventListener('touchend', resumeAudio, false);
    }
    else
    {
        document.addEventListener('click', resumeAudio);
    }

    // Set the framerate to 50 frames per second, or 20ms.
    console.log("Start game loop\n");

    window.setInterval(updateApplication, 20);

    return FMOD.OK;
}

// Function called when user presses HTML Play Sound button, with parameter 0, 1 or 2.
function playEvent(soundid)
{
    if (soundid == 0)
    {
        CHECK_RESULT( loopingAmbienceInstance.val.start() );
    }
    else if (soundid == 1)
    {
        CHECK_RESULT( loopingAmbienceInstance.val.stop(FMOD.STUDIO_STOP_IMMEDIATE) );
    }
}

// Helper function to load a bank by name.
function loadBank(name)
{
    var bankhandle = {};
    CHECK_RESULT( gSystem.loadBankFile("/" + name, FMOD.STUDIO_LOAD_BANK_NORMAL, bankhandle) );
}

// Called from main, does some application setup.  In our case we will load some sounds.
function initApplication() 
{
    console.log("Loading events\n");
    
    loadBank("Master.bank");
    loadBank("Master.strings.bank");
 
    // Get the Looping Ambience event
    var loopingAmbienceDescription = {};
    CHECK_RESULT( gSystem.getEvent("event:/Music", loopingAmbienceDescription) );
    
    CHECK_RESULT( loopingAmbienceDescription.val.createInstance(loopingAmbienceInstance) );
    
    // Once the loading is finished, re-enable the disabled buttons.
    document.getElementById("playEvent0").disabled = false;     
    document.getElementById("playEvent1").disabled = false;     
}

// Called from main, on an interval that updates at a regular rate (like in a game loop).
// Prints out information, about the system, and importantly calles System::udpate().
function updateApplication() 
{
    var result;
    var cpu = {};
    
    result = gSystemCore.getCPUUsage(cpu);
    CHECK_RESULT(result);

    var channelsplaying = {};
    result = gSystemCore.getChannelsPlaying(channelsplaying, null);
    CHECK_RESULT(result);

    document.querySelector("#display_out").value = "Channels Playing = " + channelsplaying.val + 
                                                   " : CPU = dsp " + cpu.dsp.toFixed(2) + 
                                                   "% stream " + cpu.stream.toFixed(2) + 
                                                   "% update " + cpu.update.toFixed(2) + 
                                                   "% total " + (cpu.dsp + cpu.stream + cpu.update).toFixed(2) + 
                                                   "%";
    var numbuffers = {};
    var buffersize = {};
    result = gSystemCore.getDSPBufferSize(buffersize, numbuffers);
    CHECK_RESULT(result) 

    var rate = {};
    result = gSystemCore.getSoftwareFormat(rate, null, null);
    CHECK_RESULT(result);

    var sysrate = {};
    result = gSystemCore.getDriverInfo(0, null, null, sysrate, null, null);
    CHECK_RESULT(result);
    
    var ms = numbuffers.val * buffersize.val * 1000 / rate.val;
    document.querySelector("#display_out2").value = "Mixer rate = " + rate.val + "hz : System rate = " + sysrate.val + "hz : DSP buffer size = " + numbuffers.val + " buffers of " + buffersize.val + " samples (" + ms.toFixed(2) + " ms)";

    // Update FMOD
    result = gSystem.update();
    CHECK_RESULT(result);
}
