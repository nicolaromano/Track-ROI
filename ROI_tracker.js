/*********************************************************************************/ 
/* Copyright 2018 Nicola Romano (romano.nicola@gmail.com)                        */
/*                                                                               */
/* This program is free software; you can redistribute it and/or modify          */
/* it under the terms of the GNU General Public License, version 3, as           */
/* published by the Free Software Foundation.                                    */
/*                                                                               */
/* This program is distributed in the hope that it will be useful,               */
/* but WITHOUT ANY WARRANTY; without even the implied warranty of                */
/* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the                 */
/* GNU General Public License for more details.                                  */
/*                                                                               */
/* You should have received a copy of the GNU General Public License             */
/* along with this program; if not, write to the Free Software                   */
/* Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA    */
/*********************************************************************************/

importClass(Packages.ij.IJ);
importClass(Packages.ij.ImagePlus);
importClass(Packages.ij.ImageListener);
importClass(Packages.ij.process.ImageProcessor);
importClass(Packages.ij.plugin.EventListener);
importClass(Packages.ij.gui.Overlay);
importClass(Packages.ij.gui.NonBlockingGenericDialog);
importClass(Packages.ij.gui.Roi);
importClass(Packages.ij.gui.OvalRoi);
importClass(Packages.ij.gui.PolygonRoi);
importClass(Packages.ij.gui.YesNoCancelDialog);
importClass(Packages.ij.measure.ResultsTable);
importClass(Packages.ij.io.OpenDialog);
importClass(Packages.ij.io.SaveDialog);
importClass(Packages.ij.io.RoiEncoder);
importClass(Packages.ij.io.RoiDecoder);

importClass(Packages.java.awt.Panel);
importClass(Packages.java.awt.GridBagLayout);
importClass(Packages.java.awt.GridBagConstraints);
importClass(Packages.java.awt.Insets);
importClass(Packages.java.awt.Button);
importClass(Packages.java.awt.Label);
importClass(Packages.java.awt.List);
importClass(Packages.java.awt.Color);
importClass(Packages.java.awt.Polygon);
importClass(Packages.java.io.ObjectOutputStream);
importClass(Packages.java.io.FileOutputStream);
importClass(Packages.java.io.FileInputStream);
importClass(Packages.java.io.BufferedOutputStream);
importClass(Packages.java.io.DataOutputStream);
importClass(Packages.java.io.ByteArrayOutputStream);
importClass(Packages.java.util.zip.ZipOutputStream);
importClass(Packages.java.util.zip.ZipInputStream);
importClass(Packages.java.util.zip.ZipEntry);
importClass(Packages.java.lang.Byte);

// Adds a component to a container
addComponent = function(container, component, posx, posy, width)
	{
	var gbc = new GridBagConstraints();

	gbc.fill = GridBagConstraints.HORIZONTAL;
	gbc.insets = new Insets(10, 5, 0, 5);
    gbc.gridx = posx;
    gbc.gridy = posy;
    gbc.gridwidth = width;
    
	container.add(component, gbc);
	}
	
// Creates the interface
createGUI = function()
	{
	var gd = new NonBlockingGenericDialog("ROI tracker");
	var pan = new Panel();
    var gbc = new GridBagConstraints();
	var bt;
	var row = 0;
	
   	gd.hideCancelButton();
	gd.setOKLabel("Close");

    pan.setLayout(new GridBagLayout());

	
	addComponent(pan, new Label("ROI tracker v." + ROI_tracker_version, Label.CENTER), 0, row, 2);
    
    addComponent(pan, new Label("ROI", Label.LEFT), 0, ++row, 2);
    bt = new Button("    Add    ");
	bt.addActionListener(addROI);
  	addComponent(pan, bt, 0, ++row, 1); 
	bt = new Button("Remove");
	bt.addActionListener(removeROI);
  	addComponent(pan, bt, 1, row, 1);
    bt = new Button("  Save  ");
	bt.addActionListener(saveROIs);
  	addComponent(pan, bt, 0, ++row, 1); 
	bt = new Button("  Load  ");
	bt.addActionListener(loadROIs);
  	addComponent(pan, bt, 1, row, 1);

	addComponent(pan, new Label("Keyframe", Label.LEFT), 0, ++row, 2);
	bt = new Button("   Add   ");
	bt.addActionListener(addKFROI);
  	addComponent(pan, bt, 0, ++row, 1);
	bt = new Button("Remove");
	//bt.addActionListener(remKFROI);	
  	addComponent(pan, bt, 1, row, 1);
  	
	bt = new Button("Multi-measure");
	bt.addActionListener(multiMeasure);
  	addComponent(pan, bt, 0, ++row, 2);

  	ROIList = new List(10, 0);
	ROIList.addItemListener(listListener);
	addComponent(pan, ROIList, 0, ++row, 2); 
	gd.add(pan);
	gd.addWindowListener(GUIListener);

  	gd.showDialog(); //show it
	}

// Draws the ROIs
drawROIs = function()
	{
	var overlay = new Overlay();
	var s = im.getCurrentSlice()-1;
  	var num = ROIList.getSelectedIndex();
  //	print(ROIs.length);
   	for (var i=0; i<ROIs.length; i++)
   		{
   		var r = getROI(i, s);
   		print("Showing ROI "+i+" "+r +" - selected ROI: "+num);
   		if (i == num)
   			{
   			r.setStrokeColor(Color.magenta);
   			im.setRoi(r);
			r.setStrokeColor(Color.gray);
			overlay.add(r);	
   			}
   		else
   			{
			r.setStrokeColor(Color.red);
			overlay.add(r);	
   			}	   			
   		}

   	im.setOverlay(overlay);
	}

// Gets the pixels in a ROI
getROIPixels = function(ROI)
	{
	var bnd = ROI.getBounds();
	var pix = Array();
	var i = 0;
	
	for (var y=0; y<bnd.height; y++)
		{
		for (var x=0; x<bnd.width; x++)
			{
			pix[i] = im.getProcessor().getPixel(x + bnd.x, y + bnd.y);
			i++;
			}
		}

	return pix;
	}

getROI = function(num, slice)
	{
	if (ROIs[num][slice] != null)
		{
		return ROIs[num][slice];
		}
	else
		{
		var prevROI = null, nextROI = null, prevSlice = 1, nextSlice = im.getStackSize();
		
		// Find previous and next ROI
		for (s = slice; s>=0; s--)
			{
			if (ROIs[num][s] != null)
				{
				prevROI = ROIs[num][s];
				prevSlice = s;
				break;
				}
			}
		for (s = slice; s<=im.getStackSize()-1; s++)
			{
			if (ROIs[num][s] != null)
				{
				nextROI = ROIs[num][s];
				nextSlice = s;
				break;
				}
			}

		if (nextROI != null && prevROI != null)
			return interpolateROI(prevROI, nextROI, (slice - prevSlice) / (nextSlice - prevSlice));
		else if (nextROI == null)
			return prevROI;
		else
			return nextROI; 
		}
	}

interpolateROI = function(ROI1, ROI2, weight)
	{
	var bnd1 = ROI1.getBounds();
	var bnd2 = ROI2.getBounds();
	var newROI;

	if (ROI1.getType() != ROI2.getType())
		{
		IJ.showMessage("ROIs need to be of the same type!");
		return;
		}

	if (ROI1.getType() == 0) // Rectangular ROI
		{
		newROI = new Roi((1.0-weight) * bnd1.x + weight * bnd2.x,
						 (1.0-weight) * bnd1.y + weight * bnd2.y,
						 (1.0-weight) * bnd1.width + weight * bnd2.width,
						 (1.0-weight) * bnd1.height + weight * bnd2.height);
		}
	else if (ROI1.getType() == 1) // Oval ROI
		{
		newROI = new OvalRoi((1.0-weight) * bnd1.x + weight * bnd2.x,
						 (1.0-weight) * bnd1.y + weight * bnd2.y,
						 (1.0-weight) * bnd1.width + weight * bnd2.width,
						 (1.0-weight) * bnd1.height + weight * bnd2.height);
		}
	else if (ROI1.getType() == 2) // Polygonal ROI
		{
		p1 = ROI1.getPolygon();
		p2 = ROI2.getPolygon();

		p3 = new Polygon();

		for (i=0; i<p1.npoints; i++) // We are assuming equal number of points here
			{
			p3.addPoint((1.0-weight)*p1.xpoints[i] + weight*p2.xpoints[i], 
						(1.0-weight)*p1.ypoints[i] + weight*p2.ypoints[i]);
			}
			
		newROI = new PolygonRoi(p3.xpoints, p3.ypoints, p3.npoints, Roi.POLYGON);
		}
		
	return newROI;
	}

saveROIs = function()
	{
	if (ROIs.length == 0)
		IJ.showMessage("There is no ROI to save...");
	else
		{
		var sd = new SaveDialog("Save ROIs to file", IJ.getDirectory("image"), "ROIs", ".roi");
		var zos = new ZipOutputStream(new BufferedOutputStream(new FileOutputStream(sd.getDirectory() + sd.getFileName())));
		var out = new DataOutputStream(new BufferedOutputStream(zos));
		var re = new RoiEncoder(out);

		try
			{
			for(var r=0; r<ROIs.length; r++)
				{
				for(var frame = 0; frame<im.getStackSize()-1; frame++)
					{
					if (ROIs[r][frame] != null)
						{
						//print("Writing " + ROIs[r][frame]);
						var tmp = ROIs[r][frame];
					    zos.putNextEntry(new ZipEntry("ROI__"+r+"__Frame__"+(frame+1)+"__.roi"));
	    				re.write(tmp);
	 					out.flush();
						}
					}
				}
			out.close();
			}
		catch (e) 
			{
            IJ.showMessage(""+e);
            return false;
        	} 
        finally 
        	{
            if (out!=null)
                try {
                	out.close();
                	} 
          		catch (e) {}
        	}
		}
	}

loadROIs = function()
	{
	var od = new OpenDialog("Choose a ROI file", IJ.getDirectory("image"), "*.zip");

	var dir = od.getDirectory();
	var fileName = od.getFileName();
	
	if (fileName == null)
		return;

	var fullName = dir + fileName;
    var out = new ByteArrayOutputStream();
    var nROIs = 0; 

    try { 
    	var infile = new FileInputStream(fullName);
        var instream = new ZipInputStream(infile);
        var entry = instream.getNextEntry();

		var ByteArray = Java.type("byte[]");
		var buf = new ByteArray(1024);
		var len;
        
        ROIs = Array(); // Empty ROIs
        nextROIID = 1;
        ROIList.removeAll();
        lastROI = -1;

    	while (entry!=null) 
        	{ 
            name = entry.getName();
            if (name.endsWith(".roi"))
            	{ 
                out = new ByteArrayOutputStream();
                while ((len = instream.read(buf)) > 0) 
                		{
                       	out.write(buf, 0, len); 
                		}
             
                out.close(); 
                var bytes = out.toByteArray();
                var rd = new RoiDecoder(bytes, name); 
                var roi = rd.getRoi(); 
                if (roi != null)
                	{ 
                	num = name.split("__")[1];
                	frame = name.split("__")[3];
                	//print("Importing ROI "+num+" - frame "+frame);
                	// New ROI
                	if (num != lastROI)
                		{
						ROIs[ROIs.length] = Array();
						
						for (var s=0; s<=im.getStackSize()-1; s++)
							ROIs[ROIs.length-1][s] = null;

						ROIs[ROIs.length-1][frame] = roi;

						ROIList.add("ROI " + nextROIID + " - " + roi.getTypeAsString());
						nextROIID++;
						lastROI = num;
                		}
                	else // We already added this ROI. This is a new frame
						ROIs[ROIs.length-1][frame] = roi;
			
                    //listModel.addElement(name); 
	               	}
                }
            entry = instream.getNextEntry(); 
            } 
        instream.close(); 
        } 
   catch (e) 
   		{
        IJ.showMessage(e.toString());
        }
   finally
   		{
        if (instream!=null)
           try {instream.close();} catch (e) {}
           
        if (out!=null)
                try {out.close();} catch (e) {}
        }
	}

/*********************/
/* Action listeners */
/********************/

// Listener for the ROI list
var listListener = new java.awt.event.ItemListener(
	{
	itemStateChanged : function(e)
		{
		drawROIs();
		}
	});

// Listener for the main GUI
var GUIListener = new java.awt.event.WindowListener(
	{
	windowOpened: function(e)
		{
		ImagePlus.addImageListener(imageListener);
		},	
	windowClosed: function(e)
		{
		ImagePlus.removeImageListener(imageListener);
		im.setHideOverlay(true);
		im.deleteRoi();
		},
	windowClosing: function(e){},
	windowActivated: function(e){},
	windowDeactivated: function(e){},
	windowIconified: function(e){},
	windowDeiconified: function(e){}
	});
	

// Adds a ROI to the ROI list
var addROI = new java.awt.event.ActionListener(
	{
	actionPerformed : function (e)
		{
		var currentROI = im.getRoi();
					
		if (currentROI == null)
			{
			IJ.showMessage("Draw an ROI first!");
			return;
			}
		else
			{
			ROIs[ROIs.length] = Array();
			for (var s=0; s<=im.getStackSize()-1; s++)
				ROIs[ROIs.length-1][s] = null;
				
			ROIs[ROIs.length-1][im.getCurrentSlice()-1] = currentROI;
			ROIList.add("ROI " + nextROIID + " - " + currentROI.getTypeAsString());
			nextROIID++;
			}
				
		drawROIs();
		}
	})
	
var removeROI = new java.awt.event.ActionListener(
	{
	actionPerformed : function (e)
		{
		var sel = ROIList.getSelectedIndex();

		ROIs.splice(sel, 1);
		ROIList.remove(sel)
		
		drawROIs();
		}
	})

var addKFROI = new java.awt.event.ActionListener(
	{
	actionPerformed : function (e)
		{
		var sel = ROIList.getSelectedIndex();

		if (sel == -1)
			{
			IJ.showMessage("Select an ROI from the list first!");
			}
		else
			{
			var slice = im.getCurrentSlice() - 1; // Slices are 1-indexed, arrays are 0-indexed...
			
			ROIs[sel][slice] = im.getRoi();
			}

		drawROIs();
		}
	})	

var multiMeasure = new java.awt.event.ActionListener(
	{
	actionPerformed : function (e)
		{
		var num = 0;
		rt = new ResultsTable(im.getStackSize()+1);
		
		for (var num=0; num<ROIs.length; num++)
			{
			for (var s=0; s<=im.getStackSize()-1; s++)
				{
				im.setSlice(s+1);
				im.setRoi(getROI(num, s));
				var stats = im.getAllStatistics();
				rt.setValue("Cell " + num-1, s, stats.mean);
				}
			}
			rt.show("Results");
		}
	})	

var im = new ImagePlus();
im = IJ.getImage();
stk = im.getImageStack();

imageListener = new ImageListener()
	{
    imageOpened : function(img)
    	{
        //print("Image opened: "+img);
     	},

     imageClosed : function(img)
     	{
     	//print(img);
     	if (img == im)
			{
			ImagePlus.removeImageListener(imageListener);
			}    
     	},
     	
     imageUpdated : function(img) 
     	{
     	if (img == im)
     		{
	       	drawROIs();
     		}
     	}
 	};

var ROIs = Array();
var ROIList;
var nextROIID = 1;

var ROI_tracker_version = "0.1";
print("Starting ROI tracker v." + ROI_tracker_version + 
	" (C)2017 Nicola Romanò - Released under GPL3");
createGUI();