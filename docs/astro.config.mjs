import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://rotafi-protocol.github.io',
  base: '/RotaFi',
  integrations: [
    starlight({
      title: 'RotaFi',
      logo: {
        src: './public/rotafi-logo-lockup.svg',
      },
      social: {
        github: 'https://github.com/RotaFi-Protocol/RotaFi',
      },
      sidebar: [
        {
          label: 'Overview',
          items: [
            { label: 'What is RotaFi?', link: '/overview/introduction' },
            { label: 'How ROSCA Works', link: '/overview/how-rosca-works' },
            { label: 'Architecture', link: '/overview/architecture' },
          ],
        },
        {
          label: 'Contracts',
          items: [
            { label: 'Circle Factory', link: '/contracts/circle-factory' },
            { label: 'Contribution Vault', link: '/contracts/contribution-vault' },
            { label: 'Reputation Registry', link: '/contracts/reputation-registry' },
            { label: 'Bid Engine', link: '/contracts/bid-engine' },
            { label: 'Deployed Addresses', link: '/contracts/deployed-addresses' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'Backend API', link: '/api/backend' },
            { label: 'Keeper Bot', link: '/api/keeper' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Running Locally', link: '/guides/running-locally' },
            { label: 'Deploying Contracts', link: '/guides/deploying-contracts' },
            { label: 'Creating a Circle', link: '/guides/creating-a-circle' },
          ],
        },
      ],
    }),
  ],
});
