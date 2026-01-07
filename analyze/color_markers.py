# https://github.com/pointhi/leaflet-color-markers
from folium import CustomIcon

base_url = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img"

def ColorIcon(color):
    return CustomIcon(
        base_url + "/marker-icon-2x-" + color + ".png",
        icon_size=(25, 41),
        icon_anchor=(12, 41),
        shadow_image=base_url + "/marker-shadow.png",
        shadow_size=(41, 41),
        popup_anchor=(1, -34),
    )
