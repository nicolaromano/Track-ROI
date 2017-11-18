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
importClass(Packages.ij.process.ImageProcessor);
importClass(Packages.ij.plugin.EventListener);
importClass(Packages.ij.gui.Overlay);
importClass(Packages.ij.gui.NonBlockingGenericDialog);
importClass(Packages.ij.gui.Roi);

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
//	pan.setBackground(Color.darkGray);

	addComponent(pan, new Label("ROI tracker v." + ROI_tracker_version, Label.CENTER), 0, 0, 2);
	bt = new Button("Add ROI");
	bt.addActionListener(addROI);
  	addComponent(pan, bt, 0, 1, 1); 
	bt = new Button("Remove ROI");
	bt.addActionListener(removeROI);
  	addComponent(pan, bt, 1, 1, 1);
	bt = new Button("Track ROI");
	bt.addActionListener(trackROI);
  	addComponent(pan, bt, 0, 2, 1);
	addComponent(pan, ROIList, 0, 3, 2); 
	gd.add(pan);

  	gd.showDialog(); //show it
	}

// Draws the ROIs
drawROIs = function()
	{
	var overlay = new Overlay();
	var s = im.getCurrentSlice();
  	
   	for (i=0; i<ROIs.length; i++)
   		{
   		ROIs[i][s].setStrokeColor(Color.red);
		overlay.add(ROIs[i][s]);
   		}

   	im.setOverlay(overlay);
	}

// Highlights a ROI
highlightROI = function(num)
	{
	var overlay = new Overlay();
	var s = im.getCurrentSlice();
  
   	for (i=0; i<ROIs.length; i++)
   		{
   		(i == num) ? ROIs[i][s].setStrokeColor(Color.green) :
   			ROIs[i][s].setStrokeColor(Color.red);
		overlay.add(ROIs[i][s]);
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

// Calculate Pearson's correlation coefficient
pearson = function(a1, a2)
	{
	if (a1.length != a2.length)
		{
		IJ.showMessage("Cannot calculate correlation");
		return null;
		}

	var mean1 = 0;
	var mean2 = 0;
	var i;
	
	for (i=0; i<a1.length; i++)
		{
		mean1 += a1[i];
		mean2 += a2[i];	
		}

	mean1 /= a1.length;
	mean2 /= a2.length;

	var cor = 0;
	var sumsq1 = 0;
	var sumsq2 = 0;
	for (i=0; i<a1.length; i++)
		{
		cor += (a1[i] - mean1) * (a2[i] - mean2);
	    sumsq1 += (a1[i] - mean1) * (a1[i] - mean1);
	    sumsq2 += (a2[i] - mean2) * (a2[i] - mean2); 
		}

	cor /= Math.sqrt(sumsq1) * Math.sqrt(sumsq2);

	return(cor);
	}

moveROI = function(originalROI, xoff, yoff)
	{
	var bnd = originalROI.getBounds();

	var offsetROI = new Roi(bnd.x + xoff, bnd.y + yoff, bnd.width, bnd.height);

	return(offsetROI);
	}

/*********************/
/* Action listeners */
/********************/

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
		else
			{
			ROIs[ROIs.length] = Array();
			for (var slice=1; slice<=im.getStackSize(); slice++)
				ROIs[ROIs.length-1][slice] = currentROI; // Add the current ROI for all the frames

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

var trackROI = new java.awt.event.ActionListener(
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
			highlightROI(sel);
			var maxOffset = 3;
			for (var slice=2; slice<=im.getStackSize(); slice++)
				{
				var pixels = getROIPixels(ROIs[sel][slice]);
				
				im.setSlice(slice);
				im.updateAndDraw();
				var bestcorr = -1.0;
				var bestx = 0;
				var besty = 0;
				
				for (var xoff=-maxOffset; xoff<=maxOffset; xoff++)
					{
					for(var yoff=-maxOffset; yoff<=maxOffset; yoff++)
						{
						var offROI = moveROI(ROIs[sel][slice], xoff, yoff);
						var pixels2 = getROIPixels(offROI);
						var corr = pearson(pixels, pixels2);
						if (corr > bestcorr)
							{
							bestx = xoff;
							besty = yoff;
							bestcorr = corr;
							}
						}
					}

				if ((bestx != 0) || (besty != 0))
					{
					ROIs[sel][slice] = moveROI(ROIs[sel][slice], bestx, besty);
					drawROIs();
					}
					
				print("Best correlation at [" + bestx + ", " + besty + "] - " + bestcorr);
				}
			}
		}
	})	

var im = new ImagePlus();
im = IJ.getImage();

var ROIs = Array();
var ROIList = new List(10, 0);
var nextROIID = 1;

var ROI_tracker_version = "0.1";
print("Starting ROI tracker v." + ROI_tracker_version + 
	" (C)2017 Nicola Romanò - Released under GPL3");
createGUI();