import { Icon } from 'leaflet'
import Bike from './img/bike.svg'
import Circle from './img/circle.svg'
import Clock from './img/clock.svg'
import GraduationCap from './img/graduation-cap.svg'
import Heart from './img/heart.svg'
import House from './img/house.svg'
import Work from './img/laptop.svg'
import RollerCoaster from './img/roller-coaster.svg'
import ShoppingBasket from './img/shopping-basket.svg'
import Stethoscope from './img/stethoscope.svg'
import Utensils from './img/utensils.svg'

export function getColorForMode(mode: string) {
	// Not every Mode is currently mapped
	switch (mode) {
		case 'Hiking':
		case 'Walk':
			return '#dfba06'
		case 'LightRail':
			return '#37ab9e'
		case 'RegionalTrain':
			return '#da73a0'
		case 'Train':
			return '#cd3841'
		case 'Ecar':
		case 'Car':
		case 'Ridepooling':
		case 'Carsharing':
			return '#d48004'
		case 'Subway':
			return '#3d8eb4'
		case 'Tram':
			return '#2dabc4'
		case 'Bicycle':
		case 'Ebicycle':
		case 'Bikesharing':
			return '#8da433'
		case 'Airplane':
			return '#e8b100'
		case 'Bus':
			return '#5178ab'
		case 'Boat':
		case 'Ferry':
			return '#6d6db0'
		case 'Coach':
			return '#a4419f'
		case 'Taxi':
		case 'TaxiUber':
			return '#f0d722'
		default:
			console.log('No color for:', mode)
		case 'Cablecar':
		case 'KickScooter':
			return '#4c8b9c'
	}
}

export function getIconForPurpose(purpose: string) {
	switch (purpose) {
		case 'errand':
		case 'shopping':
			return new Icon({ iconUrl: ShoppingBasket })
		case 'home':
			return new Icon({ iconUrl: House })
		case 'study':
			return new Icon({ iconUrl: GraduationCap })
		case 'wait':
			return new Icon({ iconUrl: Clock })
		case 'eat':
			return new Icon({ iconUrl: Utensils })
		case 'leisure':
			return new Icon({ iconUrl: RollerCoaster })
		case 'sport':
			return new Icon({ iconUrl: Bike })
		case 'family_friends':
			return new Icon({ iconUrl: Heart })
		case 'work':
			return new Icon({ iconUrl: Work })
		case 'medical_visit':
			return new Icon({ iconUrl: Stethoscope })
		default:
			console.log('Unknown purpose:', purpose)
		case 'unknown':
			return new Icon({ iconUrl: Circle })
	}
}

export function getGroupForMode(mode: string) {
	switch (mode) {
		case 'Hiking':
		case 'Walk':
			return 'Walk'
		case 'LightRail':
		case 'RegionalTrain':
		case 'Train':
		case 'Subway':
		case 'Tram':
		case 'Bus':
		case 'Coach':
			return 'PublicTransit'
		case 'TaxiUber':
		case 'Taxi':
			// return 'Taxi'
		case 'Ecar':
		case 'Car':
		case 'Ridepooling':
		case 'Carsharing':
			return 'Car'
		case 'Bicycle':
		case 'Ebicycle':
		case 'Bikesharing':
		case 'KickScooter':
		case 'Scooter':
			return 'Micromobility'
		case 'Airplane':
			return 'Plane'
		default:
			console.log('No group for:', mode)
		case 'Boat':
		case 'Ferry':
		case 'Cablecar':
			return 'Other'
	}
}
