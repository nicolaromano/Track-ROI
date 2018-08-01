/*********************************************************************************/ 
/* Copyright 2017 Nicola Romano (romano.nicola@gmail.com)                        */
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

importClass(Packages.java.awt.Panel);
importClass(Packages.java.awt.GridBagLayout);
importClass(Packages.java.awt.GridBagConstraints);
importClass(Packages.java.awt.Insets);
importClass(Packages.java.awt.Button);
importClass(Packages.java.awt.Label);
importClass(Packages.java.awt.List);
importClass(Packages.java.awt.Color);

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
	
   	gd.hideCancelButton();
	gd.setOKLabel("Close");

    pan.setLayout(new GridBagLayout());

	addComponent(pan, new Label("ROI tracker v." + ROI_tracker_version, Label.CENTER), 0, 0, 2);
	bt = new Button("Add ROI");
	bt.addActionListener(addROI);
  	addComponent(pan, bt, 0, 1, 1); 
	bt = new Button("Remove ROI");
	bt.addActionListener(removeROI);
  	addComponent(pan, bt, 1, 1, 1);
	bt = new Button("Add keyframe");
	bt.addActionListener(addKFROI);
  	addComponent(pan, bt, 0, 2, 1);
	bt = new Button("Rem keyframe");
	//bt.addActionListener(remKFROI);
  	addComponent(pan, bt, 1, 2, 1);
	bt = new Button("Multi-measure");
	bt.addActionListener(multiMeasure);
  	addComponent(pan, bt, 0, 3, 2);

  	ROIList = new List(10, 0);
	ROIList.addItemListener(listListener);
	addComponent(pan, ROIList, 0, 4, 2); 
	gd.add(pan);
	gd.addWindowListener(GUIListener);

  	gd.showDialog(); //show it
	}

// Draws the ROIs
drawROIs = function()
	{
	var overlay = new Overlay();
	var s = im.getCurrentSlice();
  	var num = ROIList.getSelectedIndex();
  	
   	for (i=0; i<ROIs.length; i++)
   		{
   		var r = getROI(i, s);
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
		return ROIs[num][slice];
	else
		{
		var prevROI = null, nextROI = null, prevSlice = 1, nextSlice = im.getStackSize();
		
		// Find previous and next ROI
		for (s = slice; s>0; s--) // slices are 1-based!
			{
			if (ROIs[num][s] != null)
				{
				prevROI = ROIs[num][s];
				prevSlice = s;
				break;
				}
			}
		for (s = slice; s<=im.getStackSize(); s++)
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
		newROI = ROI1;
		}
		
	return newROI;
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
			IJ.showMessage("Draw a ROI first!");
			return;
			}
		else if (currentROI.getType == 2) // Polygonal ROI
			{
			IJ.showMessage("Polygonal ROIs not supported (yet)!");
			return;			
			}

		else
			{
			ROIs[ROIs.length] = Array();
			ROIs[ROIs.length-1][im.getCurrentSlice()] = currentROI;
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
			IJ.showMessage("Select a ROI from the list first!");
			}
		else
			{
			var slice = im.getCurrentSlice();
			
			ROIs[sel][slice] = im.getRoi();
			}

		drawROIs();
		}
	})	

var multiMeasure = new java.awt.event.ActionListener(
	{
	actionPerformed : function (e)
		{
//		for (var num=0; num=ROIs.length; num++)
			{
			for (var s=1; s<=im.getStackSize(); s++)
				{
				im.setRoi(getROI(0, s))
				IJ.run("Measure");
				}
			}
		}
	})	

var im = new ImagePlus();
im = IJ.getImage();

imageListener = new ImageListener()
	{
    imageOpened : function(img)
    	{
        //print("Image opened: "+img);
     	},

     imageClosed : function(img)
     	{
     	print(img);
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