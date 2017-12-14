import Konva from 'konva'
import { scaleOrdinal, schemeCategory10 } from 'd3-scale'

const ANCHOR_DEFAULTS = {
  stroke: '#666',
  strokeWidth: 2,
  fill: '#ddd'
}

const createAnchor = ({ x, y, name }) => {
  const group = new Konva.Group({ x, y, name, draggable: true, dragOnTop: false })

  const { stroke, strokeWidth, fill } = ANCHOR_DEFAULTS
  const anchor = new Konva.Circle({ x: 0, y: 0, radius: 4, stroke, strokeWidth, fill })
  const draggableAnchor = new Konva.Circle({ x: 0, y: 0, radius: 20 })

  group.add(anchor)
  group.add(draggableAnchor)

  group.on('mouseover', function() {
    const layer = this.getLayer()
    document.body.style.cursor = 'pointer'
    anchor.setStrokeWidth(4)
    layer.draw()
  })
  group.on('mouseout', function() {
    const layer = this.getLayer()
    document.body.style.cursor = 'default'
    anchor.setStrokeWidth(2)
    if (layer) {
      layer.draw()
    }
  })

  return group
}

const LABEL_DEFAULTS = {
  opacity: 0.7,
  fontSize: 12,
  padding: 2,
  fill: 'white',
  xOffset: 4,
  yOffset: -20
}

const createLabel = ({ text, color }) => {
  const { opacity, fontSize, padding, fill, xOffset, yOffset } = LABEL_DEFAULTS

  const label = new Konva.Label({ x: xOffset, y: yOffset, opacity })

  label.add(new Konva.Tag({ fill: color }))

  label.add(new Konva.Text({ text, fontSize, padding, fill }))

  return label
}

const ANCHOR_NAMES = {
  topLeft: 'top-left-anchor',
  topRight: 'top-right-anchor',
  bottomLeft: 'bottom-left-anchor',
  bottomRight: 'bottom-right-anchor'
}

const updateBoundingBox = (activeAnchor, onUpdate) => {
  const group = activeAnchor.getParent()

  const topLeft = group.get(`.${ANCHOR_NAMES.topLeft}`)[0]
  const topRight = group.get(`.${ANCHOR_NAMES.topRight}`)[0]
  const bottomRight = group.get(`.${ANCHOR_NAMES.bottomRight}`)[0]
  const bottomLeft = group.get(`.${ANCHOR_NAMES.bottomLeft}`)[0]
  const rect = group.get('Rect')[0]
  const label = group.get('Label')[0]

  const anchorX = activeAnchor.getX()
  const anchorY = activeAnchor.getY()

  // update anchor positions
  switch (activeAnchor.getName()) {
    case ANCHOR_NAMES.topLeft:
      topRight.setY(anchorY)
      bottomLeft.setX(anchorX)
      break
    case ANCHOR_NAMES.topRight:
      topLeft.setY(anchorY)
      bottomRight.setX(anchorX)
      break
    case ANCHOR_NAMES.bottomRight:
      bottomLeft.setY(anchorY)
      topRight.setX(anchorX)
      break
    case ANCHOR_NAMES.bottomLeft:
      bottomRight.setY(anchorY)
      topLeft.setX(anchorX)
      break
    default:
      break
  }

  const { x, y } = topLeft.position()
  /*  const groupPosition = group.position()
  console.log(`group position ${groupPosition.x} ${groupPosition.y}`)
  group.position({x: groupPosition.x + x, y: groupPosition.y})
  console.log(`group position 2 ${groupPosition.x} ${groupPosition.y}`)
  console.log(`topLeft position ${x} ${y}`)
*/
  rect.position({ x, y })
  label.position({ x: x + LABEL_DEFAULTS.xOffset, y: y + LABEL_DEFAULTS.yOffset })

  const width = topRight.getX() - topLeft.getX()
  const height = bottomLeft.getY() - topLeft.getY()
  if (width && height) {
    rect.width(width)
    rect.height(height)
    group.width(width)
    group.height(height)
  }
  onUpdate({ x, y, width, height })
}

const BOUNDING_BOX_DEFAULTS = {
  width: 100,
  height: 100,
  stroke: 'black',
  strokeWidth: 2,
  opacity: 0.3
}

const colors = scaleOrdinal(schemeCategory10)

const createBoundingBox = (
  {
    x,
    y,
    width = BOUNDING_BOX_DEFAULTS.width,
    height = BOUNDING_BOX_DEFAULTS.height,
    text,
    id,
    color = colors(id)
  },
  onDragMove,
  onDragEnd
) => {
  const group = new Konva.Group({ x, y, draggable: true, id, width, height })

  group.on('dragmove', function(){
    const layer = this.getLayer()
    console.log(layer.width())
    if (group.x() <  0) {
      group.x(0)
    }
    if (group.y() <  0) {
      group.y(0)
    }
    if (group.x()  + group.width() >  layer.width()) {
      group.x(layer.width() - group.width())
    }
    if (group.y()  + group.height() >  layer.height()) {
      group.y(layer.height() - group.height())
    }

  })

  group.on('dragend', function() {
    onDragEnd({
      id,
      name: text,
      x: group.x(),
      y: group.y(),
      width: group.width(),
      height: group.height()
    })
  })

  const { stroke, strokeWidth, opacity } = BOUNDING_BOX_DEFAULTS

  const rect =new Konva.Rect({ x: 0, y: 0, width, height, stroke, strokeWidth, fill: color, opacity })
  group.add(rect)

  const topLeft = createAnchor({ x: 0, y: 0, name: ANCHOR_NAMES.topLeft })
  const topRight = createAnchor({ x: width, y: 0, name: ANCHOR_NAMES.topRight })
  const bottomRight = createAnchor({ x: width, y: height, name: ANCHOR_NAMES.bottomRight })
  const bottomLeft = createAnchor({ x: 0, y: height, name: ANCHOR_NAMES.bottomLeft })

  const anchors = [topLeft, topRight, bottomRight, bottomLeft]
  anchors.forEach(anchor => {
    group.add(anchor)

    anchor.on('dragmove', function() {
      const layer = this.getLayer()
      if (anchor.x() < -(group.x())){
        anchor.x(-(group.x()))
      }
      if (anchor.x() + group.x() > layer.width()){
        anchor.x(layer.width()-group.x())
      }
      if (anchor.y() < -(group.y())){
        anchor.y(-(group.y()))
      }
      if (anchor.y() + group.y() > layer.height()){
        anchor.y(layer.height()-group.y())
      }
      console.log(anchor.x())
      updateBoundingBox(this, onDragMove)
      layer.draw()
    })
    anchor.on('mousedown touchstart', function() {
      group.setDraggable(false)
      this.moveToTop()
    })
    anchor.on('dragend', function() {
      const layer = this.getLayer()
      group.setDraggable(true)
      group.x(group.x() + rect.x())
      group.y(group.y() + rect.y())
      layer.draw()
      onDragEnd({
        id: id,
        name: text,
        x: group.x(),
        y: group.y(),
        width: group.width(),
        height: group.height()
      })
    })
  })
  const label = createLabel({ text: text, color })
  group.add(label)
  group.label = label
  group.color = color
  return group
}

export { createBoundingBox, createLabel }
