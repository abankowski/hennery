import copy
import unittest
import gate
import settings_audit
from test_settings import settings


def tap_settings():
    return {'repository':'marcinwadon/homebrew-tap','branch':'main','environment':'release',
            'credential':'RELEASE_HOMEBREW_TOKEN','kind':'fine-grained-pat',
            'repositories':['marcinwadon/homebrew-tap'],'permissions':{'contents':'write'},
            'scope_confirmed':True}


class TapSettings(unittest.TestCase):
    def test_selected_homebrew_requires_protected_tap_only_credential_and_scope_confirmation(self):
        valid=settings();valid['release_secrets'].append('RELEASE_HOMEBREW_TOKEN');valid['homebrew']=tap_settings()
        settings_audit.validate_settings(valid,['github','homebrew'])
        app=copy.deepcopy(valid);app['homebrew']['kind']='app-installation'
        settings_audit.validate_settings(app,['github','homebrew'])
        mutations=[lambda s:s.pop('homebrew'),lambda s:s['release_secrets'].remove('RELEASE_HOMEBREW_TOKEN')]
        for key,value in (('repository','other/tap'),('branch','other'),('environment','repository'),
                          ('credential','GITHUB_TOKEN'),('kind','classic-pat'),('scope_confirmed',False),
                          ('repositories',['marcinwadon/homebrew-tap',gate.REPOSITORY]),
                          ('permissions',{'contents':'write','workflows':'write'})):
            mutations.append(lambda s,key=key,value=value:s['homebrew'].update({key:value}))
        for mutate in mutations:
            bad=copy.deepcopy(valid);mutate(bad)
            with self.subTest(settings=bad),self.assertRaises(gate.Refused):settings_audit.validate_settings(bad,['github','homebrew'])
        settings_audit.validate_settings(settings(),['github'])
